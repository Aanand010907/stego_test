from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np

from model_xray.analysis.bits import compute_bit_metrics
from model_xray.analysis.engine import analyze_layers, analyze_model
from model_xray.analysis.stats import compute_statistics
from model_xray.detector.few_shot import FewShotDetector
from model_xray.ingestion.hashing import sha256_file
from model_xray.ingestion.safetensors_loader import extract_metadata, iter_tensors
from model_xray.models.schemas import (
    ModelScanResult,
    PipelineStage,
    RiskAssessment,
    StageStatus,
)
from model_xray.reporting.pdf_generator import build_pdf_report
from model_xray.representation.grayscale_fourpart import (
    grayscale_fourpart_from_weight_dict,
    save_grayscale_png,
)
from model_xray.risk.config import RiskConfig
from model_xray.risk.scoring import score_risk
from model_xray.storage.repository import ScanRepository
from model_xray.synthetic.generate import (
    ArtifactRecord,
    generate_realistic_reference_corpus,
)

logger = logging.getLogger("model_xray.pipeline")

# Global singleton detector instance
_GLOBAL_DETECTOR: FewShotDetector | None = None
DEFAULT_SYNTHETIC_DIR = Path("testdata/synthetic")
DEFAULT_ARTIFACTS_DIR = Path("data/artifacts")


def get_or_create_synthetic_gallery(
    target_dir: Path | str = DEFAULT_SYNTHETIC_DIR,
) -> Path:
    target = Path(target_dir)
    manifest = target / "manifest.json"
    if not manifest.exists():
        logger.info(f"Generating realistic reference gallery in {target}...")
        target.mkdir(parents=True, exist_ok=True)
        generate_realistic_reference_corpus(target, seed=2026)
    return target


def get_default_detector(reference_dir: Path | str | None = None) -> FewShotDetector:
    global _GLOBAL_DETECTOR
    if _GLOBAL_DETECTOR is not None:
        return _GLOBAL_DETECTOR

    ref_dir = Path(reference_dir) if reference_dir else get_or_create_synthetic_gallery()
    manifest_path = ref_dir / "manifest.json"
    if not manifest_path.exists():
        get_or_create_synthetic_gallery(ref_dir)

    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = [
        ArtifactRecord(
            **{k: v for k, v in rec.items() if k in ArtifactRecord.__dataclass_fields__}
        )
        for rec in payload["records"]
    ]
    ref_records = [r for r in records if r.in_reference_set]
    paths = [r.path for r in ref_records]
    labels = [r.label for r in ref_records]
    detector = FewShotDetector(image_size=100, method="centroid")
    detector.fit(paths, labels, train_epochs=0)
    _GLOBAL_DETECTOR = detector
    return detector


def analyze_safetensors(
    model_path: str | Path,
    *,
    out_dir: str | Path | None = None,
    max_png_side: int | None = 1024,
    detector: FewShotDetector | None = None,
    risk_config: RiskConfig | None = None,
) -> ModelScanResult:
    model_path = Path(model_path)
    png_path = None
    json_path = None
    if out_dir is not None:
        out = Path(out_dir)
        out.mkdir(parents=True, exist_ok=True)
        stem = model_path.stem
        png_path = str(out / f"{stem}_fourpart.png")
        json_path = out / f"{stem}_scan.json"
    result = analyze_model(
        str(model_path),
        png_path=png_path,
        max_png_side=max_png_side,
        detector=detector,
        risk_config=risk_config,
    )
    if json_path is not None:
        json_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
    return result


async def execute_10_stage_scan(
    scan_id: str,
    file_path: Path | str,
    *,
    is_temp_file: bool = True,
    artifacts_dir: Path | str = DEFAULT_ARTIFACTS_DIR,
    risk_config: RiskConfig | None = None,
) -> None:
    """Execute the full 10-stage steganalysis pipeline asynchronously with real-time DB tracking."""
    repo = ScanRepository()
    file_path = Path(file_path)
    art_dir = Path(artifacts_dir)
    art_dir.mkdir(parents=True, exist_ok=True)
    scan_artifacts_dir = art_dir / scan_id
    scan_artifacts_dir.mkdir(parents=True, exist_ok=True)

    start_time = time.time()
    tensors: dict[str, np.ndarray] = {}
    metadata = None
    layers = None
    fourpart_img = None
    fourpart_png_path = None
    detector_result = None
    risk_assessment = None

    try:
        # Stage 1: QUEUED (already logged on creation)
        repo.update_stage(
            scan_id,
            PipelineStage.QUEUED,
            status=StageStatus.COMPLETED,
            progress=10,
            message="Scan initialized and queued",
        )
        await asyncio.sleep(0.05)

        # Stage 2: VALIDATION
        s2_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.VALIDATION,
            status=StageStatus.RUNNING,
            progress=15,
            message="Validating SafeTensors header and security boundaries...",
        )
        if not file_path.exists():
            raise FileNotFoundError(f"Target model file not found: {file_path}")

        # Strict SafeTensors verification
        with open(file_path, "rb") as f:
            header_size_bytes = f.read(8)
            if len(header_size_bytes) < 8:
                raise ValueError("File is too small to be a valid SafeTensors file")
            header_len = int.from_bytes(header_size_bytes, "little")
            if header_len <= 0 or header_len > 100 * 1024 * 1024:  # 100MB max header
                raise ValueError("Invalid SafeTensors header length")
            header_json = f.read(header_len)
            try:
                json.loads(header_json.decode("utf-8"))
            except Exception as e:
                raise ValueError(f"Corrupted SafeTensors header JSON: {e}")

        s2_dur = (time.time() - s2_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.VALIDATION,
            status=StageStatus.COMPLETED,
            progress=20,
            duration_ms=s2_dur,
            message="SafeTensors format verified (no executable pickle structures)",
        )
        await asyncio.sleep(0.05)

        # Stage 3: HASHING
        s3_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.HASHING,
            status=StageStatus.RUNNING,
            progress=25,
            message="Calculating cryptographic SHA-256 hash...",
        )
        sha256_hash = sha256_file(str(file_path))
        s3_dur = (time.time() - s3_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.HASHING,
            status=StageStatus.COMPLETED,
            progress=30,
            duration_ms=s3_dur,
            message=f"SHA-256: {sha256_hash[:12]}...",
        )
        await asyncio.sleep(0.05)

        # Stage 4: METADATA_EXTRACTION
        s4_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.METADATA_EXTRACTION,
            status=StageStatus.RUNNING,
            progress=35,
            message="Parsing tensor architecture and parameters...",
        )
        metadata = extract_metadata(str(file_path))
        tensors = dict(iter_tensors(str(file_path)))
        s4_dur = (time.time() - s4_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.METADATA_EXTRACTION,
            status=StageStatus.COMPLETED,
            progress=40,
            duration_ms=s4_dur,
            message=f"Extracted {metadata.tensor_count} tensors, {metadata.parameter_count:,} parameters",
        )
        await asyncio.sleep(0.05)

        # Stage 5: STATISTICAL_ANALYSIS
        s5_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.STATISTICAL_ANALYSIS,
            status=StageStatus.RUNNING,
            progress=45,
            message="Computing per-layer statistics (mean, std, skewness, kurtosis, entropy)...",
        )
        layers = analyze_layers(tensors)
        s5_dur = (time.time() - s5_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.STATISTICAL_ANALYSIS,
            status=StageStatus.COMPLETED,
            progress=55,
            duration_ms=s5_dur,
            message="Per-layer statistical moments calculated",
        )
        await asyncio.sleep(0.05)

        # Stage 6: BIT_LEVEL_ANALYSIS
        s6_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.BIT_LEVEL_ANALYSIS,
            status=StageStatus.RUNNING,
            progress=60,
            message="Extracting float32 LSB planes and neighbor correlations...",
        )
        # Layers already computed bit_level in analyze_layers
        s6_dur = (time.time() - s6_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.BIT_LEVEL_ANALYSIS,
            status=StageStatus.COMPLETED,
            progress=70,
            duration_ms=s6_dur,
            message="Bit-level steganalysis complete",
        )
        await asyncio.sleep(0.05)

        # Stage 7: FOURPART_REPRESENTATION
        s7_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.FOURPART_REPRESENTATION,
            status=StageStatus.RUNNING,
            progress=75,
            message="Generating Grayscale-Fourpart byte-plane composite image...",
        )
        fourpart_img = grayscale_fourpart_from_weight_dict(tensors)
        fourpart_shape = None
        if fourpart_img is not None:
            fourpart_shape = [int(d) for d in fourpart_img.shape]
            fourpart_png_target = scan_artifacts_dir / "fourpart.png"
            save_grayscale_png(fourpart_img, fourpart_png_target, max_side=1024)
            fourpart_png_path = str(fourpart_png_target)

        s7_dur = (time.time() - s7_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.FOURPART_REPRESENTATION,
            status=StageStatus.COMPLETED,
            progress=80,
            duration_ms=s7_dur,
            message=f"Rendered Grayscale-Fourpart composite ({fourpart_shape[0]}x{fourpart_shape[1]} px)"
            if fourpart_shape
            else "No float32 weights for image",
        )
        await asyncio.sleep(0.05)

        # Stage 8: DETECTOR_INFERENCE
        s8_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.DETECTOR_INFERENCE,
            status=StageStatus.RUNNING,
            progress=85,
            message="Evaluating few-shot CNN embeddings against reference gallery...",
        )
        try:
            detector = get_default_detector()
            detector_result = detector.predict(str(file_path))
        except Exception as e:
            logger.warning(f"Few-shot detector skipped or failed: {e}")
            detector_result = None

        s8_dur = (time.time() - s8_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.DETECTOR_INFERENCE,
            status=StageStatus.COMPLETED,
            progress=90,
            duration_ms=s8_dur,
            message=f"Detector inference complete: verdict '{detector_result.predicted_label}'"
            if detector_result
            else "Few-shot detector skipped",
        )
        await asyncio.sleep(0.05)

        # Stage 9: RISK_EVALUATION
        s9_start = time.time()
        repo.update_stage(
            scan_id,
            PipelineStage.RISK_EVALUATION,
            status=StageStatus.RUNNING,
            progress=95,
            message="Calculating composite risk score and explainability findings...",
        )
        risk_assessment = score_risk(
            tensors=tensors,
            layers=layers or [],
            detector=detector_result,
            config=risk_config,
        )
        s9_dur = (time.time() - s9_start) * 1000
        repo.update_stage(
            scan_id,
            PipelineStage.RISK_EVALUATION,
            status=StageStatus.COMPLETED,
            progress=98,
            duration_ms=s9_dur,
            message=f"Risk score: {risk_assessment.score:.1f}/100 ({risk_assessment.band})",
        )
        await asyncio.sleep(0.05)

        # Stage 10: COMPLETED
        total_duration = time.time() - start_time
        scan_result = ModelScanResult(
            metadata=metadata,
            layers=layers or [],
            grayscale_fourpart_path=fourpart_png_path,
            grayscale_fourpart_shape=fourpart_shape,
            detector=detector_result,
            risk=risk_assessment,
            deferred={
                "pt_pth": "Pickle weight formats rejected (arbitrary code execution prevention)",
                "paper_osl_srnet": "Lightweight CNN approximation of Gilkarov & Dubin metric learning",
            },
        )

        # Generate pre-cached PDF report artifact
        try:
            temp_job = repo.get_scan(scan_id)
            if temp_job:
                pdf_bytes = build_pdf_report(
                    temp_job, scan_result, fourpart_png_path=fourpart_png_path
                )
                (scan_artifacts_dir / "report.pdf").write_bytes(pdf_bytes)
        except Exception as e:
            logger.error(f"Error generating PDF artifact: {e}")

        # Persist result
        repo.complete_scan(
            scan_id,
            result=scan_result,
            fourpart_png_path=fourpart_png_path,
            duration_sec=round(total_duration, 3),
        )
        repo.update_stage(
            scan_id,
            PipelineStage.COMPLETED,
            status=StageStatus.COMPLETED,
            progress=100,
            duration_ms=total_duration * 1000,
            message="Scan completed successfully and persisted",
        )

    except Exception as e:
        logger.exception(f"Pipeline error scanning {file_path}: {e}")
        total_duration = time.time() - start_time
        repo.fail_scan(
            scan_id,
            error_message=str(e),
            failed_stage=PipelineStage.FAILED,
            duration_sec=round(total_duration, 3),
        )
    finally:
        # Guaranteed cleanup of temporary upload files
        if is_temp_file and file_path.exists():
            try:
                os.remove(file_path)
                logger.info(f"Purged temporary upload file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to remove temp file {file_path}: {e}")


def _scan_parser(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("model", help="Path to a .safetensors file")
    parser.add_argument("--out-dir", default="out")
    parser.add_argument("--max-png-side", type=int, default=1024)
    parser.add_argument(
        "--reference-dir",
        default=None,
        help="Synthetic zoo with manifest.json used as the few-shot gallery",
    )
    parser.add_argument(
        "--detector-method", choices=["centroid", "one_nn"], default="centroid"
    )
    parser.add_argument("--image-size", type=int, default=100)
    parser.add_argument("--medium", type=float, default=25.0)
    parser.add_argument("--high", type=float, default=50.0)
    parser.add_argument("--critical", type=float, default=75.0)


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if (
        argv
        and argv[0] not in {"scan", "generate-testdata", "-h", "--help"}
        and not argv[0].startswith("-")
    ):
        argv = ["scan", *argv]

    parser = argparse.ArgumentParser(
        description="Model X-Ray: SafeTensors steganalysis (scan) and synthetic test data."
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    scan_p = sub.add_parser("scan", help="Analyze a .safetensors model")
    _scan_parser(scan_p)

    gen_p = sub.add_parser(
        "generate-testdata", help="Write synthetic clean/suspicious artifacts"
    )
    gen_p.add_argument("--out-dir", default="testdata/synthetic")
    gen_p.add_argument("--seed", type=int, default=2026)

    args = parser.parse_args(argv)
    if args.cmd == "generate-testdata":
        from model_xray.synthetic.generate import SYNTHETIC_NOTICE

        records = generate_synthetic_zoo(args.out_dir, seed=args.seed)
        print(SYNTHETIC_NOTICE)
        print(f"Wrote {len(records)} artifacts under {args.out_dir}")
        return 0

    detector = None
    if args.reference_dir:
        from model_xray.pipeline import _load_detector_cli

        detector = _load_detector_cli(
            args.reference_dir, args.image_size, args.detector_method
        )
    else:
        detector = get_default_detector()

    risk_config = RiskConfig(
        medium=args.medium, high=args.high, critical=args.critical
    )
    max_side = None if args.max_png_side == 0 else args.max_png_side
    result = analyze_safetensors(
        args.model,
        out_dir=args.out_dir,
        max_png_side=max_side,
        detector=detector,
        risk_config=risk_config,
    )
    print(result.model_dump_json(indent=2))
    return 0


def _load_detector_cli(reference_dir: str, image_size: int, method: str):
    manifest_path = Path(reference_dir) / "manifest.json"
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = [
        ArtifactRecord(
            **{k: v for k, v in rec.items() if k in ArtifactRecord.__dataclass_fields__}
        )
        for rec in payload["records"]
    ]
    paths, labels = reference_gallery(records)
    if not paths:
        raise SystemExit(f"No in_reference_set records in {manifest_path}")
    detector = FewShotDetector(image_size=image_size, method=method)
    detector.fit(paths, labels, train_epochs=0)
    return detector


if __name__ == "__main__":
    raise SystemExit(main())
