from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pytest

from model_xray.pipeline import (
    DEFAULT_SYNTHETIC_DIR,
    execute_10_stage_scan,
    get_or_create_synthetic_gallery,
)
from model_xray.storage.db import init_db
from model_xray.storage.repository import ScanRepository


@pytest.fixture(autouse=True)
def setup_e2e_env(tmp_path, monkeypatch):
    test_db = tmp_path / "e2e_test.db"
    test_art = tmp_path / "artifacts"
    monkeypatch.setenv("MODEL_XRAY_DB_PATH", str(test_db))
    monkeypatch.setattr("model_xray.pipeline.DEFAULT_ARTIFACTS_DIR", test_art)
    monkeypatch.setattr("model_xray.api.routes.DEFAULT_ARTIFACTS_DIR", test_art)
    init_db()


def test_clean_vs_suspicious_calibration(tmp_path) -> None:
    async def _run():
        # 1. Get synthetic zoo
        syn_dir = get_or_create_synthetic_gallery(tmp_path / "synthetic_zoo")
        manifest = json.loads((syn_dir / "manifest.json").read_text(encoding="utf-8"))
        records = manifest["records"]

        # Pick clean record and matching suspicious x8 (25% ER) record
        clean_rec = next(r for r in records if r["label"] == "clean")
        arch = clean_rec["architecture"]
        sus_rec = next(
            r
            for r in records
            if r["label"] == "suspicious"
            and r["architecture"] == arch
            and int(r.get("x_lsb", r.get("n_lsb_randomized", 0))) == 8
        )

        repo = ScanRepository()

        # Scan clean model
        clean_job = repo.create_scan(
            scan_id="test-clean-1",
            filename="tiny_residual.safetensors",
            file_size_bytes=Path(clean_rec["path"]).stat().st_size,
            is_demo=True,
        )
        await execute_10_stage_scan(
            "test-clean-1",
            clean_rec["path"],
            is_temp_file=False,
        )
        clean_res = repo.get_scan("test-clean-1")
        assert clean_res is not None
        assert clean_res.status == "COMPLETED"
        assert clean_res.risk_band == "LOW"
        assert clean_res.risk_score is not None
        assert clean_res.risk_score < 35.0

        # Scan suspicious model
        sus_job = repo.create_scan(
            scan_id="test-sus-1",
            filename=f"{arch}_x8.safetensors",
            file_size_bytes=Path(sus_rec["path"]).stat().st_size,
            is_demo=True,
        )
        await execute_10_stage_scan(
            "test-sus-1",
            sus_rec["path"],
            is_temp_file=False,
        )
        sus_res = repo.get_scan("test-sus-1")
        assert sus_res is not None
        assert sus_res.status == "COMPLETED"
        assert sus_res.risk_score is not None
        assert sus_res.risk_band is not None

        # Clean score must be <= suspicious score
        assert clean_res.risk_score <= sus_res.risk_score

    asyncio.run(_run())
