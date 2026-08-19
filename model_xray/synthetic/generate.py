"""Synthetic SafeTensors test artifacts for defensive steganalysis.

Every file is explicitly labeled:
"Synthetic security test artifact — no executable malware."

This module produces:
1. Paired synthetic stego benchmarks from real clean model checkpoints (e.g., Microsoft ResNet-50)
   by applying controlled, non-executable pseudorandom LSB perturbations.
2. Realistic clean reference corpora representing diverse architectures (MLP, ConvNet, Attention, Residual)
   with natural IEEE-754 weight distributions (no artificial mantissa bit-zeroing).
"""

from __future__ import annotations

import argparse
import datetime
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
from safetensors import safe_open
from safetensors.numpy import save_file

from model_xray.ingestion.hashing import sha256_file

SYNTHETIC_NOTICE = "Synthetic security test artifact — no executable malware."
FLOAT32_BITS = 32
MAX_MANTISSA_LSB = 23  # Keep perturbations inside float32 mantissa (bits 0-22)


@dataclass
class ArtifactRecord:
    path: str
    filename: str
    base_model_sha256: str
    generated_model_sha256: str
    label: str  # "clean" or "suspicious"
    architecture: str
    x_lsb: int
    embedding_rate: float
    affected_tensor_count: int
    affected_parameter_count: int
    affected_parameter_fraction: float
    random_seed: int
    generation_timestamp: str
    in_reference_set: bool
    notice: str = SYNTHETIC_NOTICE


def embedding_rate_from_lsb_count(n_lsb: int) -> float:
    """Paper ER = X / 32 for float32 weights."""
    return float(n_lsb) / float(FLOAT32_BITS)


def randomize_lowest_mantissa_bits(
    array: np.ndarray,
    n_lsb: int,
    rng: np.random.Generator,
) -> np.ndarray:
    """Replace the lowest n_lsb bits of each float32 with deterministic pseudorandom bits.

    Does not encode data or executable payload. Sign and exponent bits are untouched.
    """
    if not 1 <= n_lsb <= MAX_MANTISSA_LSB:
        raise ValueError(f"n_lsb must be in [1, {MAX_MANTISSA_LSB}] (mantissa only)")
    flat = np.ascontiguousarray(array, dtype=np.float32).reshape(-1)
    bits = flat.view(np.uint32).copy()
    mask = np.uint32((1 << n_lsb) - 1)
    keep = np.uint32(0xFFFFFFFF) ^ mask
    random_bits = rng.integers(0, 1 << n_lsb, size=bits.size, dtype=np.uint32)
    bits = (bits & keep) | (random_bits & mask)
    return bits.view(np.float32).reshape(array.shape)


def load_safetensors_dict(path: str | Path) -> dict[str, np.ndarray]:
    """Load all tensors from a SafeTensors file into a numpy dict."""
    tensors: dict[str, np.ndarray] = {}
    with safe_open(str(path), framework="np") as f:
        for k in f.keys():
            tensors[k] = f.get_tensor(k)
    return tensors


def generate_paired_stego_dataset(
    input_checkpoint: str | Path,
    output_dir: str | Path,
    *,
    seed: int = 2026,
    rates_lsb: tuple[int, ...] = (1, 2, 4, 8),
    architecture_name: str | None = None,
    in_reference_set: bool = False,
) -> list[ArtifactRecord]:
    """Generate paired clean and X-LSB suspicious variants from a single real clean model.

    The clean and suspicious variants have:
    - Identical architecture and layer structure
    - Identical tensor names and shapes
    - Same parameter count and dtype distribution
    - Controlled pseudorandom bit perturbation on float32 weights only.
    """
    input_path = Path(input_checkpoint)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    base_sha256 = sha256_file(input_path)
    base_stem = input_path.stem
    arch = architecture_name or base_stem
    rng = np.random.default_rng(seed)

    tensors = load_safetensors_dict(input_path)
    total_params = sum(t.size for t in tensors.values())
    float32_tensors = {k: v for k, v in tensors.items() if v.dtype == np.float32}
    float32_params = sum(t.size for t in float32_tensors.values())

    records: list[ArtifactRecord] = []
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Clean reference copy
    clean_dir = out / "clean"
    clean_dir.mkdir(parents=True, exist_ok=True)
    clean_path = clean_dir / f"{base_stem}.safetensors"

    clean_metadata = {
        "notice": SYNTHETIC_NOTICE,
        "artifact_class": "clean_baseline_checkpoint",
        "label": "clean",
        "architecture": arch,
        "base_model_sha256": base_sha256,
        "x_lsb": "0",
        "embedding_rate": "0.0",
        "affected_tensor_count": "0",
        "affected_parameter_count": "0",
        "random_seed": str(seed),
        "generation_timestamp": timestamp,
        "in_reference_set": "true" if in_reference_set else "false",
    }
    save_file(tensors, str(clean_path), metadata=clean_metadata)
    clean_sha256 = sha256_file(clean_path)

    records.append(
        ArtifactRecord(
            path=str(clean_path.resolve()),
            filename=clean_path.name,
            base_model_sha256=base_sha256,
            generated_model_sha256=clean_sha256,
            label="clean",
            architecture=arch,
            x_lsb=0,
            embedding_rate=0.0,
            affected_tensor_count=0,
            affected_parameter_count=0,
            affected_parameter_fraction=0.0,
            random_seed=seed,
            generation_timestamp=timestamp,
            in_reference_set=in_reference_set,
        )
    )

    # 2. Stego variants (X in {1, 2, 4, 8} LSBs)
    for x in rates_lsb:
        stego_dir = out / f"stego_{x}lsb"
        stego_dir.mkdir(parents=True, exist_ok=True)
        stego_path = stego_dir / f"{base_stem}_x{x}.safetensors"

        er = embedding_rate_from_lsb_count(x)
        sus_tensors: dict[str, np.ndarray] = {}
        for k, v in tensors.items():
            if v.dtype == np.float32:
                sus_tensors[k] = randomize_lowest_mantissa_bits(v, x, rng)
            else:
                sus_tensors[k] = v.copy()

        stego_metadata = {
            "notice": SYNTHETIC_NOTICE,
            "artifact_class": "synthetic_security_test",
            "label": "suspicious",
            "architecture": arch,
            "base_model_sha256": base_sha256,
            "x_lsb": str(x),
            "embedding_rate": f"{er:.6f}",
            "affected_tensor_count": str(len(float32_tensors)),
            "affected_parameter_count": str(float32_params),
            "random_seed": str(seed),
            "generation_timestamp": timestamp,
            "in_reference_set": "true" if in_reference_set else "false",
        }
        save_file(sus_tensors, str(stego_path), metadata=stego_metadata)
        stego_sha256 = sha256_file(stego_path)

        records.append(
            ArtifactRecord(
                path=str(stego_path.resolve()),
                filename=stego_path.name,
                base_model_sha256=base_sha256,
                generated_model_sha256=stego_sha256,
                label="suspicious",
                architecture=arch,
                x_lsb=x,
                embedding_rate=er,
                affected_tensor_count=len(float32_tensors),
                affected_parameter_count=float32_params,
                affected_parameter_fraction=float(float32_params) / float(total_params) if total_params else 0.0,
                random_seed=seed,
                generation_timestamp=timestamp,
                in_reference_set=in_reference_set,
            )
        )

    # Manifest file
    manifest: dict[str, Any] = {
        "notice": SYNTHETIC_NOTICE,
        "base_model": {
            "filename": input_path.name,
            "sha256": base_sha256,
            "architecture": arch,
            "total_parameters": total_params,
            "float32_parameters": float32_params,
        },
        "embedding_rate_definition": "ER = X / 32 (Paper Section III)",
        "records": [asdict(r) for r in records],
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return records


def generate_realistic_reference_corpus(
    output_dir: str | Path,
    *,
    seed: int = 2026,
    rates_lsb: tuple[int, ...] = (1, 2, 4, 8),
) -> list[ArtifactRecord]:
    """Generate realistic reference corpus across distinct architectures for detector gallery.

    Weights use natural normal distributions (e.g. He/Xavier initializations) so their
    mantissas have realistic natural entropy, unlike artificial zeroed-out synthetic weights.
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)

    # Realistic architectures with standard weight initializations (natural IEEE-754 mantissa distributions)
    architectures = {
        "realistic_mlp": {
            "fc1.weight": rng.normal(0.0, 0.05, size=(64, 32)).astype(np.float32),
            "fc1.bias": rng.normal(0.0, 0.01, size=(32,)).astype(np.float32),
            "fc2.weight": rng.normal(0.0, 0.05, size=(32, 16)).astype(np.float32),
            "fc2.bias": rng.normal(0.0, 0.01, size=(16,)).astype(np.float32),
            "fc3.weight": rng.normal(0.0, 0.05, size=(16, 8)).astype(np.float32),
            "fc3.bias": rng.normal(0.0, 0.01, size=(8,)).astype(np.float32),
        },
        "realistic_conv": {
            "conv1.weight": rng.normal(0.0, 0.04, size=(16, 3, 3, 3)).astype(np.float32),
            "conv1.bias": rng.normal(0.0, 0.01, size=(16,)).astype(np.float32),
            "conv2.weight": rng.normal(0.0, 0.04, size=(32, 16, 3, 3)).astype(np.float32),
            "conv2.bias": rng.normal(0.0, 0.01, size=(32,)).astype(np.float32),
            "fc.weight": rng.normal(0.0, 0.05, size=(32, 10)).astype(np.float32),
            "fc.bias": rng.normal(0.0, 0.01, size=(10,)).astype(np.float32),
        },
        "realistic_attention": {
            "q.weight": rng.normal(0.0, 0.03, size=(32, 32)).astype(np.float32),
            "k.weight": rng.normal(0.0, 0.03, size=(32, 32)).astype(np.float32),
            "v.weight": rng.normal(0.0, 0.03, size=(32, 32)).astype(np.float32),
            "proj.weight": rng.normal(0.0, 0.03, size=(32, 32)).astype(np.float32),
        },
        "realistic_residual": {
            "conv1.weight": rng.normal(0.0, 0.04, size=(16, 16, 3, 3)).astype(np.float32),
            "conv1.bias": rng.normal(0.0, 0.01, size=(16,)).astype(np.float32),
            "conv2.weight": rng.normal(0.0, 0.04, size=(16, 16, 3, 3)).astype(np.float32),
            "conv2.bias": rng.normal(0.0, 0.01, size=(16,)).astype(np.float32),
            "shortcut.weight": rng.normal(0.0, 0.04, size=(16, 16, 1, 1)).astype(np.float32),
        },
    }

    all_records: list[ArtifactRecord] = []
    tmp_dir = out / "_tmp_clean_bases"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    for arch_name, t_dict in architectures.items():
        base_file = tmp_dir / f"{arch_name}.safetensors"
        save_file(t_dict, str(base_file))
        records = generate_paired_stego_dataset(
            base_file,
            out / arch_name,
            seed=seed,
            rates_lsb=rates_lsb,
            architecture_name=arch_name,
            in_reference_set=True,
        )
        all_records.extend(records)

    # Master manifest
    manifest = {
        "notice": SYNTHETIC_NOTICE,
        "description": "Realistic clean model reference corpus and paired stego benchmarks.",
        "embedding_rate_definition": "ER = X / 32",
        "records": [asdict(r) for r in all_records],
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return all_records


def main() -> None:
    parser = argparse.ArgumentParser(description="Model X-Ray Synthetic Benchmark Generator")
    parser.add_argument("--input", type=str, help="Path to clean SafeTensors model checkpoint")
    parser.add_argument("--output-dir", type=str, required=True, help="Directory to save generated benchmarks")
    parser.add_argument("--seed", type=int, default=2026, help="Random seed")
    parser.add_argument("--arch", type=str, default=None, help="Architecture label")
    args = parser.parse_args()

    if args.input:
        records = generate_paired_stego_dataset(args.input, args.output_dir, seed=args.seed, architecture_name=args.arch)
        print(f"Generated {len(records)} benchmark models from {args.input} in {args.output_dir}")
    else:
        records = generate_realistic_reference_corpus(args.output_dir, seed=args.seed)
        print(f"Generated {len(records)} realistic reference models in {args.output_dir}")


if __name__ == "__main__":
    main()
