from __future__ import annotations

import io
import time
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from safetensors.numpy import save_file

from model_xray.api.app import app
from model_xray.storage.db import init_db


@pytest.fixture(autouse=True)
def setup_test_environment(tmp_path, monkeypatch):
    test_db = tmp_path / "test_model_xray.db"
    test_syn = tmp_path / "synthetic"
    test_art = tmp_path / "artifacts"
    monkeypatch.setenv("MODEL_XRAY_DB_PATH", str(test_db))
    monkeypatch.setattr("model_xray.pipeline.DEFAULT_SYNTHETIC_DIR", test_syn)
    monkeypatch.setattr("model_xray.pipeline.DEFAULT_ARTIFACTS_DIR", test_art)
    monkeypatch.setattr("model_xray.api.routes.DEFAULT_SYNTHETIC_DIR", test_syn)
    monkeypatch.setattr("model_xray.api.routes.DEFAULT_ARTIFACTS_DIR", test_art)
    init_db()


def test_health_endpoint() -> None:
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "Gilkarov" in data["reference_paper"]


def test_models_and_stats_endpoint() -> None:
    client = TestClient(app)
    resp = client.get("/api/models")
    assert resp.status_code == 200
    data = resp.json()
    assert "demo_models" in data
    assert len(data["demo_models"]) > 0

    stats_resp = client.get("/api/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_scans" in stats
    assert "risk_distribution" in stats


def test_reject_pytorch_pickle_files() -> None:
    client = TestClient(app)
    fake_pt = io.BytesIO(b"PK\x03\x04fake_pytorch_archive")
    resp = client.post(
        "/api/scan",
        files={"file": ("malicious_model.pt", fake_pt, "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "Security Rejection" in resp.json()["detail"]


def test_demo_scan_and_polling(tmp_path) -> None:
    client = TestClient(app)
    # Get available demo models
    models_resp = client.get("/api/models")
    assert models_resp.status_code == 200
    demo_models = models_resp.json()["demo_models"]
    assert len(demo_models) > 0
    sample_id = demo_models[0]["id"]

    # Trigger demo scan on first demo model
    resp = client.post("/api/scan/demo", json={"sample_id": sample_id})
    assert resp.status_code == 202
    data = resp.json()
    scan_id = data["scan_id"]
    assert data["status"] == "PROCESSING"

    # Poll status until complete or timeout
    max_wait = 20
    start = time.time()
    completed = False
    while time.time() - start < max_wait:
        poll_resp = client.get(f"/api/scan/{scan_id}")
        assert poll_resp.status_code == 200
        poll_data = poll_resp.json()
        if poll_data["status"] == "COMPLETED":
            completed = True
            break
        time.sleep(0.2)

    assert completed, f"Scan did not complete within {max_wait}s"

    # Verify report JSON
    rep_resp = client.get(f"/api/scan/{scan_id}/report")
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert rep_data["status"] == "COMPLETED"
    assert rep_data["risk_band"] == "LOW"
    assert rep_data["risk_score"] < 30.0

    # Verify PDF download
    pdf_resp = client.get(f"/api/scan/{scan_id}/report/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000

    # Verify JSON export download
    json_resp = client.get(f"/api/scan/{scan_id}/report/json")
    assert json_resp.status_code == 200
    assert json_resp.headers["content-type"] == "application/json"


def test_upload_scan_flow(tmp_path) -> None:
    client = TestClient(app)
    # Create a small valid safetensors file in memory
    tensors = {
        "weight": np.random.normal(0, 0.1, size=(8, 8)).astype(np.float32),
    }
    buf = io.BytesIO()
    temp_file = tmp_path / "custom.safetensors"
    save_file(tensors, str(temp_file))
    file_bytes = temp_file.read_bytes()

    upload_buf = io.BytesIO(file_bytes)
    resp = client.post(
        "/api/scan",
        files={"file": ("custom.safetensors", upload_buf, "application/octet-stream")},
    )
    assert resp.status_code == 202
    scan_id = resp.json()["scan_id"]

    # Poll status
    for _ in range(30):
        poll_resp = client.get(f"/api/scan/{scan_id}")
        if poll_resp.json()["status"] in {"COMPLETED", "FAILED"}:
            break
        time.sleep(0.2)

    final = client.get(f"/api/scan/{scan_id}").json()
    assert final["status"] == "COMPLETED"
    assert final["result"] is not None
    assert final["result"]["metadata"]["tensor_count"] == 1
