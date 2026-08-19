from __future__ import annotations

import io
import json
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

from model_xray.models.schemas import (
    DashboardStats,
    DemoModelOption,
    ScanCreateResponse,
    ScanJob,
)
from model_xray.pipeline import (
    DEFAULT_ARTIFACTS_DIR,
    DEFAULT_SYNTHETIC_DIR,
    execute_10_stage_scan,
    get_default_detector,
    get_or_create_synthetic_gallery,
)
from model_xray.reporting.pdf_generator import build_pdf_report
from model_xray.storage.repository import ScanRepository

logger = logging.getLogger("model_xray.api")
router = APIRouter(prefix="/api", tags=["Model X-Ray"])

TMP_UPLOADS_DIR = Path("data/tmp_uploads")
TMP_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_BYTES", 250 * 1024 * 1024))  # 250 MB


class DemoScanRequest(BaseModel):
    sample_id: str


def _get_demo_models_list() -> list[DemoModelOption]:
    syn_dir = get_or_create_synthetic_gallery(DEFAULT_SYNTHETIC_DIR)
    manifest_path = syn_dir / "manifest.json"
    if not manifest_path.exists():
        return []

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    options: list[DemoModelOption] = []
    for rec in manifest.get("records", []):
        p = Path(rec["path"])
        file_stem = p.stem
        label = rec.get("label", "clean")
        arch = rec.get("architecture", "unknown")
        rate = float(rec.get("embedding_rate", 0.0))
        n_lsb = int(rec.get("x_lsb", rec.get("n_lsb_randomized", 0)))

        if label == "clean":
            desc = f"Clean benchmark checkpoint ({arch}) with structured mantissa bits."
            expected = "LOW Risk (Clean Model)"
        else:
            desc = (
                f"Synthetic perturbed variant ({arch}) with {n_lsb}/32 lowest mantissa "
                f"bits randomized ({rate * 100:.2f}% stego-embedding rate simulation)."
            )
            expected = f"{'CRITICAL' if n_lsb >= 8 else 'HIGH' if n_lsb >= 4 else 'MEDIUM'} Risk (Steganographic Anomaly)"

        options.append(
            DemoModelOption(
                id=file_stem,
                filename=p.name,
                name=f"{arch.replace('_', ' ').title()} - {label.upper()}"
                + (f" ({n_lsb} LSBs / {rate*100:.1f}%)" if n_lsb > 0 else " (Clean baseline)"),
                label=label,
                architecture=arch,
                embedding_rate_percent=round(rate * 100, 2),
                n_lsb_randomized=n_lsb,
                description=desc,
                expected_verdict=expected,
            )
        )
    return options


@router.get("/health")
def health_check() -> dict[str, Any]:
    detector_ready = False
    try:
        get_default_detector()
        detector_ready = True
    except Exception as e:
        logger.warning(f"Detector not yet loaded: {e}")

    return {
        "status": "healthy",
        "service": "Model X-Ray Defensive Steganalysis Engine",
        "version": "1.0.0",
        "reference_paper": "Gilkarov & Dubin (arXiv:2409.19310)",
        "detector_loaded": detector_ready,
        "supported_format": "safetensors",
        "storage": "sqlite3",
    }


@router.get("/models")
def list_demo_models() -> dict[str, Any]:
    demo_models = _get_demo_models_list()
    repo = ScanRepository()
    recent = repo.list_scans(limit=10)
    return {
        "demo_models": demo_models,
        "recent_scans_count": len(recent),
        "security_policy": {
            "allowed_formats": [".safetensors"],
            "rejected_formats": [".pt", ".pth", ".bin", ".pkl", ".onnx"],
            "rejection_reason": "Pickle and executable weight serialization formats pose arbitrary code execution vulnerabilities.",
        },
    }


@router.get("/stats", response_model=DashboardStats)
def get_stats() -> DashboardStats:
    repo = ScanRepository()
    return repo.get_dashboard_stats()


@router.post("/scan", response_model=ScanCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_and_scan(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> ScanCreateResponse:
    filename = file.filename or "model.safetensors"

    # Strict file format validation
    lower_name = filename.lower()
    if lower_name.endswith((".pt", ".pth", ".bin", ".pkl")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Security Rejection: File '{filename}' appears to be a PyTorch pickle/binary archive. "
                "PyTorch pickle files can execute arbitrary malicious code upon deserialization. "
                "Model X-Ray only accepts verified zero-code-execution SafeTensors (.safetensors) models."
            ),
        )

    if not lower_name.endswith(".safetensors"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid format: Only .safetensors files are supported.",
        )

    scan_id = str(uuid.uuid4())
    temp_target = TMP_UPLOADS_DIR / f"{scan_id}.safetensors"

    # Stream upload with size cap
    size = 0
    with open(temp_target, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_SIZE_BYTES:
                buffer.close()
                if temp_target.exists():
                    os.remove(temp_target)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES / (1024*1024):.1f} MB",
                )
            buffer.write(chunk)

    repo = ScanRepository()
    scan_job = repo.create_scan(
        scan_id=scan_id,
        filename=filename,
        file_size_bytes=size,
        is_demo=False,
    )

    # Launch background 10-stage execution pipeline
    background_tasks.add_task(
        execute_10_stage_scan,
        scan_id=scan_id,
        file_path=temp_target,
        is_temp_file=True,
    )

    return ScanCreateResponse(
        scan_id=scan_id,
        status="PROCESSING",
        filename=filename,
        is_demo=False,
        created_at=scan_job.created_at,
        message="Model file successfully uploaded and queued for 10-stage steganalysis.",
    )


@router.post("/scan/demo", response_model=ScanCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def scan_demo_model(
    payload: DemoScanRequest,
    background_tasks: BackgroundTasks,
) -> ScanCreateResponse:
    syn_dir = get_or_create_synthetic_gallery(DEFAULT_SYNTHETIC_DIR)
    target_file: Path | None = None

    # 1. Search manifest records
    manifest_path = syn_dir / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for rec in manifest.get("records", []):
            rec_p = Path(rec["path"])
            if payload.sample_id in {rec_p.stem, rec.get("filename"), rec_p.name}:
                if rec_p.exists():
                    target_file = rec_p
                    break

    # 2. Search clean or suspicious folders
    if target_file is None:
        for sub in ["clean", "suspicious", "stego_1lsb", "stego_2lsb", "stego_4lsb", "stego_8lsb"]:
            candidate = syn_dir / sub / f"{payload.sample_id}.safetensors"
            if candidate.exists():
                target_file = candidate
                break

    # 3. Recursive glob fallback
    if target_file is None:
        matches = list(syn_dir.rglob(f"*{payload.sample_id}*.safetensors"))
        if matches:
            target_file = matches[0]

    if target_file is None or not target_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo model sample '{payload.sample_id}' not found in synthetic repository.",
        )

    scan_id = str(uuid.uuid4())
    temp_target = TMP_UPLOADS_DIR / f"{scan_id}_{target_file.name}"
    shutil.copy2(target_file, temp_target)

    file_size = temp_target.stat().st_size
    repo = ScanRepository()
    scan_job = repo.create_scan(
        scan_id=scan_id,
        filename=target_file.name,
        file_size_bytes=file_size,
        is_demo=True,
        demo_sample_id=payload.sample_id,
    )

    background_tasks.add_task(
        execute_10_stage_scan,
        scan_id=scan_id,
        file_path=temp_target,
        is_temp_file=True,
    )

    return ScanCreateResponse(
        scan_id=scan_id,
        status="PROCESSING",
        filename=target_file.name,
        is_demo=True,
        created_at=scan_job.created_at,
        message=f"Synthetic demo model '{target_file.name}' queued for 10-stage steganalysis.",
    )


@router.get("/scan/{scan_id}", response_model=ScanJob)
def get_scan_details(scan_id: str) -> ScanJob:
    repo = ScanRepository()
    scan = repo.get_scan(scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' not found.",
        )
    return scan


@router.get("/scan/{scan_id}/report")
def get_scan_report(scan_id: str) -> dict[str, Any]:
    repo = ScanRepository()
    scan = repo.get_scan(scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' not found.",
        )
    if scan.status == "PROCESSING":
        return {
            "status": "PROCESSING",
            "current_stage": scan.current_stage,
            "progress": scan.progress,
            "message": "Scan is currently in progress across the 10-stage pipeline.",
        }
    if scan.status == "FAILED":
        return {
            "status": "FAILED",
            "error": scan.error_message,
        }

    return {
        "scan_id": scan.id,
        "filename": scan.filename,
        "sha256": scan.sha256,
        "status": scan.status,
        "duration_sec": scan.duration_sec,
        "model_architecture": scan.model_arch,
        "risk_score": scan.risk_score,
        "risk_band": scan.risk_band,
        "created_at": scan.created_at,
        "completed_at": scan.completed_at,
        "result": scan.result,
        "artifacts": {
            "fourpart_image_url": f"/api/scan/{scan.id}/artifacts/fourpart.png",
            "pdf_report_url": f"/api/scan/{scan.id}/report/pdf",
            "json_report_url": f"/api/scan/{scan.id}/report/json",
        },
    }


@router.get("/scan/{scan_id}/report/pdf")
def download_pdf_report(scan_id: str) -> Response:
    repo = ScanRepository()
    scan = repo.get_scan(scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' not found.",
        )
    if scan.status != "COMPLETED" or not scan.result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot generate PDF: Scan is in status '{scan.status}'.",
        )

    # Check cached PDF
    cached_pdf = DEFAULT_ARTIFACTS_DIR / scan_id / "report.pdf"
    if cached_pdf.exists():
        return FileResponse(
            str(cached_pdf),
            media_type="application/pdf",
            filename=f"ModelXRay_Report_{scan.filename.replace('.safetensors', '')}_{scan_id[:8]}.pdf",
        )

    # Generate on demand
    fourpart_img = DEFAULT_ARTIFACTS_DIR / scan_id / "fourpart.png"
    pdf_bytes = build_pdf_report(
        scan,
        scan.result,
        fourpart_png_path=fourpart_img if fourpart_img.exists() else None,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="ModelXRay_Report_{scan.filename.replace(".safetensors", "")}_{scan_id[:8]}.pdf"'
        },
    )


@router.get("/scan/{scan_id}/report/json")
def download_json_report(scan_id: str) -> Response:
    repo = ScanRepository()
    scan = repo.get_scan(scan_id)
    if not scan or not scan.result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan result with ID '{scan_id}' not found.",
        )

    json_str = scan.result.model_dump_json(indent=2)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="ModelXRay_Scan_{scan.filename.replace(".safetensors", "")}_{scan_id[:8]}.json"'
        },
    )


@router.get("/scan/{scan_id}/artifacts")
def list_scan_artifacts(scan_id: str) -> dict[str, Any]:
    repo = ScanRepository()
    scan = repo.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    art_dir = DEFAULT_ARTIFACTS_DIR / scan_id
    artifacts = []
    if art_dir.exists():
        for f in art_dir.iterdir():
            artifacts.append(
                {
                    "name": f.name,
                    "size_bytes": f.stat().st_size,
                    "url": f"/api/scan/{scan_id}/artifacts/{f.name}",
                }
            )

    return {
        "scan_id": scan_id,
        "artifacts": artifacts,
    }


@router.get("/scan/{scan_id}/artifacts/fourpart.png")
def get_fourpart_image(scan_id: str) -> Response:
    img_path = DEFAULT_ARTIFACTS_DIR / scan_id / "fourpart.png"
    if not img_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grayscale-Fourpart image not generated or not available for this model.",
        )
    return FileResponse(str(img_path), media_type="image/png")
