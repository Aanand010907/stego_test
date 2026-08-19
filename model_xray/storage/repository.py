from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from model_xray.models.schemas import (
    DashboardStats,
    ModelScanResult,
    PipelineStage,
    ScanJob,
    StageInfo,
    StageStatus,
)
from model_xray.storage.db import get_db_connection

STAGE_NAMES = {
    PipelineStage.QUEUED: "1. Scan Queued",
    PipelineStage.VALIDATION: "2. SafeTensors & Security Validation",
    PipelineStage.HASHING: "3. SHA-256 Digest Calculation",
    PipelineStage.METADATA_EXTRACTION: "4. Layer & Metadata Extraction",
    PipelineStage.STATISTICAL_ANALYSIS: "5. Per-Layer Statistical Analysis",
    PipelineStage.BIT_LEVEL_ANALYSIS: "6. Float32 Bit-Level Steganalysis",
    PipelineStage.FOURPART_REPRESENTATION: "7. Grayscale-Fourpart Plane Rendering",
    PipelineStage.DETECTOR_INFERENCE: "8. Few-Shot CNN Metric Inference",
    PipelineStage.RISK_EVALUATION: "9. Multi-Factor Risk Assessment",
    PipelineStage.COMPLETED: "10. Scan Finalized & Storage Persisted",
    PipelineStage.FAILED: "Scan Failed",
}

DEFAULT_STAGES = [
    PipelineStage.QUEUED,
    PipelineStage.VALIDATION,
    PipelineStage.HASHING,
    PipelineStage.METADATA_EXTRACTION,
    PipelineStage.STATISTICAL_ANALYSIS,
    PipelineStage.BIT_LEVEL_ANALYSIS,
    PipelineStage.FOURPART_REPRESENTATION,
    PipelineStage.DETECTOR_INFERENCE,
    PipelineStage.RISK_EVALUATION,
    PipelineStage.COMPLETED,
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_stage_list() -> list[StageInfo]:
    stages: list[StageInfo] = []
    for stage in DEFAULT_STAGES:
        stages.append(
            StageInfo(
                stage=stage,
                name=STAGE_NAMES.get(stage, str(stage.value)),
                status=StageStatus.PENDING,
            )
        )
    if stages:
        stages[0].status = StageStatus.COMPLETED
        stages[0].completed_at = _now_iso()
    return stages


class ScanRepository:
    def __init__(self, conn: sqlite3.Connection | None = None) -> None:
        self._external_conn = conn

    def _get_conn(self) -> sqlite3.Connection:
        if self._external_conn is not None:
            return self._external_conn
        return get_db_connection()

    def create_scan(
        self,
        *,
        scan_id: str,
        filename: str,
        file_size_bytes: int,
        is_demo: bool = False,
        demo_sample_id: str | None = None,
    ) -> ScanJob:
        conn = self._get_conn()
        now = _now_iso()
        stages = init_stage_list()
        stages_json = json.dumps([s.model_dump() for s in stages])

        with conn:
            conn.execute(
                """
                INSERT INTO scans (
                    id, filename, file_size_bytes, status, current_stage,
                    progress, stages_json, created_at, is_demo, demo_sample_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    scan_id,
                    filename,
                    file_size_bytes,
                    "PROCESSING",
                    PipelineStage.QUEUED.value,
                    10,
                    stages_json,
                    now,
                    1 if is_demo else 0,
                    demo_sample_id,
                ),
            )

        if self._external_conn is None:
            conn.close()

        return ScanJob(
            id=scan_id,
            filename=filename,
            file_size_bytes=file_size_bytes,
            status="PROCESSING",
            current_stage=PipelineStage.QUEUED,
            progress=10,
            stages=stages,
            created_at=now,
            is_demo=is_demo,
            demo_sample_id=demo_sample_id,
        )

    def update_stage(
        self,
        scan_id: str,
        stage: PipelineStage,
        *,
        status: StageStatus = StageStatus.RUNNING,
        progress: int | None = None,
        message: str | None = None,
        duration_ms: float | None = None,
    ) -> None:
        conn = self._get_conn()
        now = _now_iso()

        with conn:
            cursor = conn.execute("SELECT stages_json FROM scans WHERE id = ?", (scan_id,))
            row = cursor.fetchone()
            if not row:
                if self._external_conn is None:
                    conn.close()
                return

            stages_data = json.loads(row["stages_json"])
            stages = [StageInfo(**s) for s in stages_data]

            stage_idx = -1
            for i, s in enumerate(stages):
                if s.stage == stage:
                    stage_idx = i
                    break

            if stage_idx >= 0:
                s = stages[stage_idx]
                s.status = status
                if status == StageStatus.RUNNING and not s.started_at:
                    s.started_at = now
                elif status in {StageStatus.COMPLETED, StageStatus.FAILED}:
                    s.completed_at = now
                    if duration_ms is not None:
                        s.duration_ms = duration_ms
                if message is not None:
                    s.message = message

            calculated_progress = progress
            if calculated_progress is None:
                total_stages = len(stages)
                completed_count = sum(1 for s in stages if s.status == StageStatus.COMPLETED)
                calculated_progress = min(100, int((completed_count / total_stages) * 100))

            updated_stages_json = json.dumps([s.model_dump() for s in stages])

            conn.execute(
                """
                UPDATE scans
                SET current_stage = ?,
                    progress = ?,
                    stages_json = ?
                WHERE id = ?
                """,
                (stage.value, calculated_progress, updated_stages_json, scan_id),
            )

        if self._external_conn is None:
            conn.close()

    def complete_scan(
        self,
        scan_id: str,
        *,
        result: ModelScanResult,
        fourpart_png_path: str | None,
        duration_sec: float,
    ) -> None:
        conn = self._get_conn()
        now = _now_iso()

        with conn:
            cursor = conn.execute("SELECT stages_json FROM scans WHERE id = ?", (scan_id,))
            row = cursor.fetchone()
            stages_json = "[]"
            if row:
                stages_data = json.loads(row["stages_json"])
                stages = [StageInfo(**s) for s in stages_data]
                for s in stages:
                    s.status = StageStatus.COMPLETED
                    if not s.completed_at:
                        s.completed_at = now
                stages_json = json.dumps([s.model_dump() for s in stages])

            risk_score = result.risk.score if result.risk else None
            risk_band = result.risk.band if result.risk else None
            sha256 = result.metadata.sha256 if result.metadata else None

            # Detect architecture from metadata or tensor names
            model_arch = "custom"
            if result.metadata and result.metadata.file_metadata:
                model_arch = result.metadata.file_metadata.get("architecture", "custom")
            if model_arch == "custom" and result.metadata and result.metadata.tensors:
                t_names = [t.name for t in result.metadata.tensors]
                if any("conv" in n for n in t_names):
                    model_arch = "CNN"
                elif any("q.weight" in n or "attn" in n for n in t_names):
                    model_arch = "Transformer Attention"
                elif any("fc" in n or "lin" in n for n in t_names):
                    model_arch = "MLP / Dense"

            conn.execute(
                """
                UPDATE scans
                SET status = 'COMPLETED',
                    current_stage = ?,
                    progress = 100,
                    stages_json = ?,
                    completed_at = ?,
                    duration_sec = ?,
                    sha256 = ?,
                    risk_score = ?,
                    risk_band = ?,
                    model_arch = ?,
                    result_json = ?,
                    fourpart_png_path = ?
                WHERE id = ?
                """,
                (
                    PipelineStage.COMPLETED.value,
                    stages_json,
                    now,
                    duration_sec,
                    sha256,
                    risk_score,
                    risk_band,
                    model_arch,
                    result.model_dump_json(),
                    fourpart_png_path,
                    scan_id,
                ),
            )

        if self._external_conn is None:
            conn.close()

    def fail_scan(
        self,
        scan_id: str,
        *,
        error_message: str,
        failed_stage: PipelineStage = PipelineStage.FAILED,
        duration_sec: float | None = None,
    ) -> None:
        conn = self._get_conn()
        now = _now_iso()

        with conn:
            cursor = conn.execute("SELECT stages_json FROM scans WHERE id = ?", (scan_id,))
            row = cursor.fetchone()
            stages_json = "[]"
            if row:
                stages_data = json.loads(row["stages_json"])
                stages = [StageInfo(**s) for s in stages_data]
                for s in stages:
                    if s.stage == failed_stage:
                        s.status = StageStatus.FAILED
                        s.message = error_message
                        s.completed_at = now
                stages_json = json.dumps([s.model_dump() for s in stages])

            conn.execute(
                """
                UPDATE scans
                SET status = 'FAILED',
                    current_stage = ?,
                    error_message = ?,
                    stages_json = ?,
                    completed_at = ?,
                    duration_sec = ?
                WHERE id = ?
                """,
                (
                    failed_stage.value,
                    error_message,
                    stages_json,
                    now,
                    duration_sec,
                    scan_id,
                ),
            )

        if self._external_conn is None:
            conn.close()

    def get_scan(self, scan_id: str) -> ScanJob | None:
        conn = self._get_conn()
        cursor = conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
        row = cursor.fetchone()
        if self._external_conn is None:
            conn.close()
        if not row:
            return None
        return self._row_to_scan_job(row)

    def list_scans(self, limit: int = 50, offset: int = 0) -> list[ScanJob]:
        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT * FROM scans
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        )
        rows = cursor.fetchall()
        if self._external_conn is None:
            conn.close()
        return [self._row_to_scan_job(row) for row in rows]

    def get_dashboard_stats(self) -> DashboardStats:
        conn = self._get_conn()
        cursor = conn.execute("SELECT COUNT(*) as cnt FROM scans")
        total = cursor.fetchone()["cnt"]

        cursor = conn.execute(
            "SELECT COUNT(*) as cnt FROM scans WHERE risk_band = 'LOW' AND status = 'COMPLETED'"
        )
        clean = cursor.fetchone()["cnt"]

        cursor = conn.execute(
            "SELECT COUNT(*) as cnt FROM scans WHERE risk_band IN ('MEDIUM', 'HIGH', 'CRITICAL') AND status = 'COMPLETED'"
        )
        suspicious = cursor.fetchone()["cnt"]

        cursor = conn.execute(
            """
            SELECT risk_band, COUNT(*) as cnt
            FROM scans
            WHERE status = 'COMPLETED' AND risk_band IS NOT NULL
            GROUP BY risk_band
            """
        )
        dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for row in cursor.fetchall():
            band = row["risk_band"]
            if band in dist:
                dist[band] = row["cnt"]

        cursor = conn.execute(
            "SELECT AVG(duration_sec) as avg_d FROM scans WHERE status = 'COMPLETED' AND duration_sec IS NOT NULL"
        )
        avg_row = cursor.fetchone()
        avg_duration = round(avg_row["avg_d"] or 0.0, 2)

        recent = self.list_scans(limit=10)
        recent_scans_summary = [
            {
                "id": s.id,
                "filename": s.filename,
                "created_at": s.created_at,
                "status": s.status,
                "risk_band": s.risk_band,
                "risk_score": s.risk_score,
                "model_arch": s.model_arch,
                "is_demo": s.is_demo,
                "duration_sec": s.duration_sec,
            }
            for s in recent
        ]

        if self._external_conn is None:
            conn.close()

        return DashboardStats(
            total_scans=total,
            clean_count=clean,
            suspicious_count=suspicious,
            risk_distribution=dist,
            average_duration_sec=avg_duration,
            recent_scans=recent_scans_summary,
        )

    def _row_to_scan_job(self, row: sqlite3.Row) -> ScanJob:
        stages_data = json.loads(row["stages_json"]) if row["stages_json"] else []
        stages = [StageInfo(**s) for s in stages_data]
        result = None
        if row["result_json"]:
            try:
                result = ModelScanResult.model_validate_json(row["result_json"])
            except Exception:
                pass

        fourpart_url = None
        if row["fourpart_png_path"]:
            fourpart_url = f"/api/scan/{row['id']}/artifacts/fourpart.png"

        return ScanJob(
            id=row["id"],
            filename=row["filename"],
            file_size_bytes=row["file_size_bytes"],
            sha256=row["sha256"],
            status=row["status"],
            current_stage=PipelineStage(row["current_stage"]),
            progress=row["progress"],
            stages=stages,
            created_at=row["created_at"],
            completed_at=row["completed_at"],
            duration_sec=row["duration_sec"],
            is_demo=bool(row["is_demo"]),
            demo_sample_id=row["demo_sample_id"],
            model_arch=row["model_arch"],
            risk_score=row["risk_score"],
            risk_band=row["risk_band"],
            error_message=row["error_message"],
            result=result,
            fourpart_image_url=fourpart_url,
        )
