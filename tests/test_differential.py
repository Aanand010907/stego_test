from __future__ import annotations

from pathlib import Path
import numpy as np
from safetensors.numpy import save_file

from model_xray.analysis.differential import compute_differential_scan
from model_xray.synthetic.generate import randomize_lowest_mantissa_bits


def test_differential_clean_vs_stego(tmp_path: Path) -> None:
    rng = np.random.default_rng(2026)
    ref_file = tmp_path / "model_ref.safetensors"
    clean_file = tmp_path / "model_clean.safetensors"
    stego_file = tmp_path / "model_stego.safetensors"

    tensors = {
        "conv1.weight": rng.normal(0, 0.05, size=(16, 8, 3, 3)).astype(np.float32),
        "conv1.bias": rng.normal(0, 0.01, size=(16,)).astype(np.float32),
        "fc.weight": rng.normal(0, 0.05, size=(16, 10)).astype(np.float32),
    }
    save_file(tensors, str(ref_file))
    save_file(tensors, str(clean_file))

    stego_tensors = {
        k: randomize_lowest_mantissa_bits(v, 2, rng) if v.dtype == np.float32 else v
        for k, v in tensors.items()
    }
    save_file(stego_tensors, str(stego_file))

    # 1. Compare Clean vs Ref
    res_clean = compute_differential_scan(ref_file, clean_file)
    assert res_clean.total_altered_parameters == 0
    assert res_clean.altered_parameter_fraction == 0.0
    assert res_clean.differential_risk_score == 0.0
    assert res_clean.differential_risk_band == "LOW"

    # 2. Compare Stego vs Ref
    res_stego = compute_differential_scan(ref_file, stego_file)
    assert res_stego.total_altered_parameters > 0
    assert res_stego.altered_parameter_fraction > 0.60
    assert res_stego.differential_risk_score >= 85.0
    assert res_stego.differential_risk_band == "CRITICAL"
    assert "Steganographic Tampering Detected" in res_stego.tampering_evidence
