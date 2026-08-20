"""Paired Differential Steganalysis Engine.

Compares a candidate model directly against a verified, trusted reference base model.
Extracts tensor-level, parameter-level, and bitwise XOR differences to detect and localize
weight-level tampering or steganographic payloads.

Note: Differential analysis provides weight-level tampering evidence, which distinguishes
unmodified weights from modified weights with 100% mathematical certainty when the trusted
reference checkpoint is available.
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
from safetensors import safe_open

from model_xray.ingestion.hashing import sha256_file
from model_xray.models.schemas import DifferentialLayerDiff, DifferentialScanResult


def load_safetensors_arrays(path: str | Path) -> dict[str, np.ndarray]:
    tensors: dict[str, np.ndarray] = {}
    with safe_open(str(path), framework="np") as f:
        for k in f.keys():
            tensors[k] = f.get_tensor(k)
    return tensors


def compute_differential_scan(
    reference_path: str | Path,
    candidate_path: str | Path,
) -> DifferentialScanResult:
    """Execute paired differential analysis between trusted reference and candidate model."""
    ref_p = Path(reference_path)
    cand_p = Path(candidate_path)

    ref_sha = sha256_file(ref_p)
    cand_sha = sha256_file(cand_p)

    ref_tensors = load_safetensors_arrays(ref_p)
    cand_tensors = load_safetensors_arrays(cand_p)

    all_keys = sorted(set(ref_tensors.keys()) | set(cand_tensors.keys()))
    layer_diffs: list[DifferentialLayerDiff] = []

    total_params = 0
    total_altered_params = 0
    altered_layers_count = 0

    for name in all_keys:
        if name not in ref_tensors or name not in cand_tensors:
            # Structural addition / deletion
            t = cand_tensors[name] if name in cand_tensors else ref_tensors[name]
            p_count = int(t.size)
            total_params += p_count
            total_altered_params += p_count
            altered_layers_count += 1
            layer_diffs.append(
                DifferentialLayerDiff(
                    layer_name=name,
                    parameter_count=p_count,
                    altered_parameter_count=p_count,
                    altered_fraction=1.0,
                    l2_distance=float(np.linalg.norm(t)),
                    max_absolute_diff=float(np.max(np.abs(t))) if t.size else 0.0,
                    altered_bit_positions=list(range(32)),
                    min_altered_bit=0,
                    max_altered_bit=31,
                )
            )
            continue

        r_arr = ref_tensors[name]
        c_arr = cand_tensors[name]
        p_count = int(r_arr.size)
        total_params += p_count

        if r_arr.shape != c_arr.shape or r_arr.dtype != c_arr.dtype:
            total_altered_params += p_count
            altered_layers_count += 1
            layer_diffs.append(
                DifferentialLayerDiff(
                    layer_name=name,
                    parameter_count=p_count,
                    altered_parameter_count=p_count,
                    altered_fraction=1.0,
                    l2_distance=999.0,
                    max_absolute_diff=999.0,
                    altered_bit_positions=list(range(32)),
                    min_altered_bit=0,
                    max_altered_bit=31,
                )
            )
            continue

        # Value comparison
        diff_mask = r_arr != c_arr
        n_diff = int(np.count_nonzero(diff_mask))

        if n_diff == 0:
            continue

        total_altered_params += n_diff
        altered_layers_count += 1

        delta = (c_arr.astype(np.float64) - r_arr.astype(np.float64)).reshape(-1)
        l2_dist = float(np.linalg.norm(delta))
        max_abs = float(np.max(np.abs(delta)))

        altered_bits: list[int] = []
        min_bit = None
        max_bit = None

        if np.dtype(r_arr.dtype) == np.dtype(np.float32):
            u_ref = np.ascontiguousarray(r_arr, dtype=np.float32).reshape(-1).view(np.uint32)
            u_cand = np.ascontiguousarray(c_arr, dtype=np.float32).reshape(-1).view(np.uint32)
            xor_diff = u_ref ^ u_cand

            for b in range(32):
                if np.any((xor_diff >> np.uint32(b)) & np.uint32(1)):
                    altered_bits.append(b)

            if altered_bits:
                min_bit = min(altered_bits)
                max_bit = max(altered_bits)

        layer_diffs.append(
            DifferentialLayerDiff(
                layer_name=name,
                parameter_count=p_count,
                altered_parameter_count=n_diff,
                altered_fraction=float(n_diff) / float(p_count) if p_count else 0.0,
                l2_distance=l2_dist,
                max_absolute_diff=max_abs,
                altered_bit_positions=altered_bits,
                min_altered_bit=min_bit,
                max_altered_bit=max_bit,
            )
        )

    altered_frac = float(total_altered_params) / float(total_params) if total_params else 0.0

    # Risk Scoring for Differential Mode:
    # 0 altered params -> Score = 0 (LOW)
    # Altered params limited strictly to lowest mantissa LSBs (0-7) with tiny magnitude -> HIGH / CRITICAL stego tampering
    if total_altered_params == 0:
        diff_score = 0.0
        diff_band = "LOW"
        tamper_evidence = "Verified Bit-Identical: Candidate matches trusted reference checkpoint exactly."
    else:
        # Check if tampering is focused on low mantissa bits
        max_bits_across_layers = [l.max_altered_bit for l in layer_diffs if l.max_altered_bit is not None]
        highest_bit_altered = max(max_bits_across_layers) if max_bits_across_layers else 31

        if highest_bit_altered <= 7:
            # Classic LSB Steganography (Lowest byte of float32 mantissa tampered)
            diff_score = 85.0 + min(15.0, altered_frac * 15.0)
            diff_band = "CRITICAL"
            tamper_evidence = (
                f"Steganographic Tampering Detected: {total_altered_params:,} parameters "
                f"({altered_frac*100:.2f}%) altered across {altered_layers_count}/{len(all_keys)} layers. "
                f"Modifications are confined to lowest {highest_bit_altered + 1} mantissa bit(s) "
                f"(max absolute diff: {max(l.max_absolute_diff for l in layer_diffs):.2e})."
            )
        else:
            diff_score = 70.0 + min(30.0, altered_frac * 30.0)
            diff_band = "HIGH" if diff_score < 75.0 else "CRITICAL"
            tamper_evidence = (
                f"Weight Tampering / Fine-Tuning Delta Detected: {total_altered_params:,} parameters "
                f"({altered_frac*100:.2f}%) altered across {altered_layers_count} layers, including exponent/sign bits."
            )

    return DifferentialScanResult(
        reference_model=ref_p.name,
        reference_sha256=ref_sha,
        candidate_model=cand_p.name,
        candidate_sha256=cand_sha,
        total_parameters=total_params,
        total_altered_parameters=total_altered_params,
        altered_parameter_fraction=round(altered_frac, 6),
        altered_layers_count=altered_layers_count,
        total_layers_count=len(all_keys),
        layers=layer_diffs,
        tampering_evidence=tamper_evidence,
        differential_risk_score=round(diff_score, 2),
        differential_risk_band=diff_band,
    )
