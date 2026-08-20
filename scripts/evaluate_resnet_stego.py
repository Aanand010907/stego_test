#!/usr/bin/env python3
"""Evaluate Model X-Ray detection pipeline on paired Microsoft ResNet-50 stego benchmark.

Generates paired variants derived from testdata/checkpoints/resnet50.safetensors:
- clean (0 LSBs, ER=0.0%)
- stego_1lsb (1 LSB, ER=3.125%)
- stego_2lsb (2 LSBs, ER=6.25%)
- stego_4lsb (4 LSBs, ER=12.5%)
- stego_8lsb (8 LSBs, ER=25.0%)

Performs paired integrity checks, evaluates all 5 variants through the full Model X-Ray pipeline,
prints a detailed comparison table, and saves evaluation_results.json.
"""

from __future__ import annotations

import datetime
import json
from pathlib import Path
import sys
from typing import Any

import numpy as np
from safetensors import safe_open
from safetensors.numpy import save_file

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from model_xray.analysis.bits import compute_bit_metrics
from model_xray.analysis.stats import compute_statistics
from model_xray.ingestion.hashing import sha256_file
from model_xray.pipeline import analyze_safetensors, get_default_detector
from model_xray.synthetic.generate import (
    SYNTHETIC_NOTICE,
    embedding_rate_from_lsb_count,
    randomize_lowest_mantissa_bits,
)

BENCHMARK_DIR = ROOT / "testdata" / "real_resnet_benchmark"
RESNET_PATH = ROOT / "testdata" / "checkpoints" / "resnet50.safetensors"
SEED = 2026


def load_tensors(path: Path) -> dict[str, np.ndarray]:
    tensors = {}
    with safe_open(str(path), framework="np") as f:
        for k in f.keys():
            tensors[k] = f.get_tensor(k)
    return tensors


def generate_and_verify_benchmark(
    base_checkpoint: Path,
    out_dir: Path,
    seed: int = SEED,
    rates_lsb: tuple[int, ...] = (1, 2, 4, 8),
) -> list[dict[str, Any]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    base_sha256 = sha256_file(base_checkpoint)
    base_tensors = load_tensors(base_checkpoint)
    rng = np.random.default_rng(seed)

    total_params = sum(t.size for t in base_tensors.values())
    f32_tensors = {k: v for k, v in base_tensors.items() if v.dtype == np.float32}
    f32_params = sum(t.size for t in f32_tensors.values())

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    manifest_records: list[dict[str, Any]] = []

    # 1. Clean Checkpoint
    clean_path = out_dir / "resnet50_clean.safetensors"
    clean_meta = {
        "notice": SYNTHETIC_NOTICE,
        "artifact_class": "clean_baseline_checkpoint",
        "label": "clean",
        "architecture": "resnet50",
        "base_model_sha256": base_sha256,
        "x_lsb": "0",
        "embedding_rate": "0.0",
        "affected_tensor_count": "0",
        "affected_parameter_count": "0",
        "random_seed": str(seed),
        "generation_timestamp": timestamp,
    }
    save_file(base_tensors, str(clean_path), metadata=clean_meta)
    clean_sha = sha256_file(clean_path)

    manifest_records.append({
        "variant": "clean",
        "filename": clean_path.name,
        "path": str(clean_path.resolve()),
        "label": "clean",
        "architecture": "resnet50",
        "x_lsb": 0,
        "embedding_rate": 0.0,
        "total_parameters": total_params,
        "float32_parameters": f32_params,
        "affected_tensor_count": 0,
        "affected_parameter_count": 0,
        "affected_parameter_fraction": 0.0,
        "base_model_sha256": base_sha256,
        "sha256": clean_sha,
        "random_seed": seed,
        "generation_timestamp": timestamp,
    })

    # 2. Stego Checkpoints
    for x in rates_lsb:
        stego_path = out_dir / f"resnet50_stego_{x}lsb.safetensors"
        er = embedding_rate_from_lsb_count(x)
        stego_tensors: dict[str, np.ndarray] = {}

        for k, v in base_tensors.items():
            if v.dtype == np.float32:
                stego_tensors[k] = randomize_lowest_mantissa_bits(v, x, rng)
            else:
                stego_tensors[k] = v.copy()

        stego_meta = {
            "notice": SYNTHETIC_NOTICE,
            "artifact_class": "synthetic_security_test",
            "label": "suspicious",
            "architecture": "resnet50",
            "base_model_sha256": base_sha256,
            "x_lsb": str(x),
            "embedding_rate": f"{er:.6f}",
            "affected_tensor_count": str(len(f32_tensors)),
            "affected_parameter_count": str(f32_params),
            "random_seed": str(seed),
            "generation_timestamp": timestamp,
        }
        save_file(stego_tensors, str(stego_path), metadata=stego_meta)
        stego_sha = sha256_file(stego_path)

        manifest_records.append({
            "variant": f"stego_{x}lsb",
            "filename": stego_path.name,
            "path": str(stego_path.resolve()),
            "label": "suspicious",
            "architecture": "resnet50",
            "x_lsb": x,
            "embedding_rate": er,
            "total_parameters": total_params,
            "float32_parameters": f32_params,
            "affected_tensor_count": len(f32_tensors),
            "affected_parameter_count": f32_params,
            "affected_parameter_fraction": float(f32_params) / float(total_params) if total_params else 0.0,
            "base_model_sha256": base_sha256,
            "sha256": stego_sha,
            "random_seed": seed,
            "generation_timestamp": timestamp,
        })

    # Save manifest
    manifest_doc = {
        "notice": SYNTHETIC_NOTICE,
        "base_model": {
            "name": "microsoft/resnet-50",
            "source_file": str(base_checkpoint),
            "sha256": base_sha256,
            "total_parameters": total_params,
            "float32_parameters": f32_params,
        },
        "embedding_rate_definition": "ER = X / 32",
        "records": manifest_records,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest_doc, indent=2), encoding="utf-8")

    # 3. Automated Integrity Verification
    print("Running Paired Integrity Verification across all generated checkpoints...")
    for rec in manifest_records:
        var_path = Path(rec["path"])
        tensors = load_tensors(var_path)
        x = rec["x_lsb"]

        # Check 1: Key names match clean
        assert set(tensors.keys()) == set(base_tensors.keys()), f"Tensor names mismatch in {var_path.name}"

        for k in base_tensors:
            t_orig = base_tensors[k]
            t_var = tensors[k]

            # Check 2: Shapes match
            assert t_orig.shape == t_var.shape, f"Shape mismatch in {var_path.name}:{k}"
            # Check 3: Dtypes match
            assert t_orig.dtype == t_var.dtype, f"Dtype mismatch in {var_path.name}:{k}"
            # Check 6: No NaN/Inf
            assert np.all(np.isfinite(t_var)), f"NaN/Inf found in {var_path.name}:{k}"

            if t_orig.dtype != np.float32:
                # Check 4: Non-float tensors are bit-identical
                assert np.array_equal(t_orig, t_var), f"Non-float tensor altered in {var_path.name}:{k}"
            else:
                if x == 0:
                    assert np.array_equal(t_orig, t_var), f"Clean copy altered in {var_path.name}:{k}"
                else:
                    # Check 5: Target tensors differ ONLY in lowest X mantissa bits
                    u_orig = np.ascontiguousarray(t_orig).reshape(-1).view(np.uint32)
                    u_var = np.ascontiguousarray(t_var).reshape(-1).view(np.uint32)
                    mask = np.uint32((1 << x) - 1)
                    keep_mask = ~mask
                    diff_outside_mask = (u_orig ^ u_var) & keep_mask
                    assert np.all(diff_outside_mask == 0), f"Perturbation leaked beyond {x} LSBs in {var_path.name}:{k}"

        print(f"  ✓ [{rec['variant']:12}] Integrity Verified (SHA-256: {rec['sha256'][:12]}...)")

    return manifest_records


def run_pipeline_evaluation(manifest_records: list[dict[str, Any]], out_dir: Path) -> list[dict[str, Any]]:
    detector = get_default_detector()
    results: list[dict[str, Any]] = []

    print("\nRunning Full Model X-Ray Pipeline on all 5 variants...")
    for rec in manifest_records:
        path = Path(rec["path"])
        scan_res = analyze_safetensors(path, detector=detector)

        tensors = load_tensors(path)
        parts = [np.ascontiguousarray(arr, dtype=np.float32).reshape(-1) for arr in tensors.values() if arr.dtype == np.float32]
        concat = np.concatenate(parts)
        bits = compute_bit_metrics(concat)
        stats = compute_statistics(concat)

        d_clean = scan_res.detector.distance_to_clean_centroid if scan_res.detector else None
        d_susp = scan_res.detector.distance_to_suspicious_centroid if scan_res.detector else None
        affinity = 0.0
        if d_clean is not None and d_susp is not None and (d_clean + d_susp) > 0:
            affinity = d_clean / (d_clean + d_susp)

        comp_dict = {c.name: c.component_score for c in scan_res.risk.components}

        row: dict[str, Any] = {
            "variant": rec["variant"],
            "filename": rec["filename"],
            "label": rec["label"],
            "x_lsb": rec["x_lsb"],
            "embedding_rate_percent": round(rec["embedding_rate"] * 100, 3),
            "lsb_entropy": float(bits.lsb_entropy),
            "local_regularity": float(bits.local_regularity),
            "lsb_ones_ratio": float(bits.lsb_ones_ratio),
            "neighbor_lsb_correlation": float(bits.neighbor_lsb_correlation) if bits.neighbor_lsb_correlation is not None else None,
            "mean_bit_frequency_deviation": float(bits.mean_bit_frequency_deviation),
            "histogram_entropy": float(stats.entropy),
            "embedding_d_clean": float(d_clean) if d_clean is not None else None,
            "embedding_d_suspicious": float(d_susp) if d_susp is not None else None,
            "embedding_affinity": float(affinity),
            "detector_prediction": scan_res.detector.predicted_label if scan_res.detector else None,
            "component_scores": comp_dict,
            "risk_score": float(scan_res.risk.score),
            "risk_band": scan_res.risk.band,
        }
        results.append(row)

    # Save results JSON
    eval_json = out_dir / "evaluation_results.json"
    eval_json.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nSaved evaluation results to {eval_json}")
    return results


def print_comparison_table(results: list[dict[str, Any]]) -> None:
    headers = [
        "Variant",
        "X",
        "ER (%)",
        "H_LSB",
        "R_local",
        "P(b0=1)",
        "r_neighbor",
        "Mean BFD",
        "H_hist",
        "d_clean",
        "d_susp",
        "Affinity",
        "Pred",
        "Score",
        "Band",
    ]

    print("\n" + "=" * 145)
    print("MODEL X-RAY: PAIRED MICROSOFT RESNET-50 STEGANALYSIS BENCHMARK EVALUATION")
    print("=" * 145)

    row_fmt = (
        "{:<12} | {:<2} | {:<6} | {:<7} | {:<7} | {:<7} | {:<10} | {:<8} | "
        "{:<6} | {:<7} | {:<7} | {:<8} | {:<6} | {:<6} | {:<8}"
    )

    print(row_fmt.format(*headers))
    print("-" * 145)

    for r in results:
        corr_str = f"{r['neighbor_lsb_correlation']:.4f}" if r['neighbor_lsb_correlation'] is not None else "N/A"
        dc_str = f"{r['embedding_d_clean']:.4f}" if r['embedding_d_clean'] is not None else "N/A"
        ds_str = f"{r['embedding_d_suspicious']:.4f}" if r['embedding_d_suspicious'] is not None else "N/A"

        print(
            row_fmt.format(
                r["variant"],
                str(r["x_lsb"]),
                f"{r['embedding_rate_percent']:.2f}%",
                f"{r['lsb_entropy']:.4f}",
                f"{r['local_regularity']:.4f}",
                f"{r['lsb_ones_ratio']:.4f}",
                corr_str,
                f"{r['mean_bit_frequency_deviation']:.4f}",
                f"{r['histogram_entropy']:.3f}",
                dc_str,
                ds_str,
                f"{r['embedding_affinity']:.4f}",
                str(r["detector_prediction"]),
                f"{r['risk_score']:.2f}",
                str(r["risk_band"]),
            )
        )
    print("=" * 145)


def main() -> None:
    if not RESNET_PATH.exists():
        print(f"ERROR: Base checkpoint not found at {RESNET_PATH}")
        sys.exit(1)

    print(f"Base Checkpoint: {RESNET_PATH} ({RESNET_PATH.stat().st_size:,} bytes)")
    manifest_records = generate_and_verify_benchmark(RESNET_PATH, BENCHMARK_DIR, seed=SEED)
    results = run_pipeline_evaluation(manifest_records, BENCHMARK_DIR)
    print_comparison_table(results)


if __name__ == "__main__":
    main()
