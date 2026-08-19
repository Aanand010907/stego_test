from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from safetensors.numpy import save_file

from model_xray.ingestion.hashing import sha256_file
from model_xray.ingestion.safetensors_loader import (
    UnsupportedModelFormatError,
    extract_metadata,
)


def _tiny_model(path: Path) -> None:
    save_file(
        {
            "encoder.weight": np.arange(12, dtype=np.float32).reshape(3, 4),
            "encoder.bias": np.zeros(3, dtype=np.float32),
            "token_ids": np.array([1, 2, 3, 4], dtype=np.int64),
        },
        str(path),
    )


def test_extract_metadata_shapes_counts_and_hash(tmp_path: Path) -> None:
    path = tmp_path / "tiny.safetensors"
    _tiny_model(path)
    meta = extract_metadata(path)
    assert meta.file_size_bytes == path.stat().st_size
    assert meta.sha256 == sha256_file(path)
    assert meta.tensor_count == 3
    assert meta.parameter_count == 12 + 3 + 4
    assert meta.dtype_distribution["float32"] == 15
    assert meta.dtype_distribution["int64"] == 4
    assert meta.tensor_dtype_counts["float32"] == 2
    by_name = {t.name: t for t in meta.tensors}
    assert by_name["encoder.weight"].shape == [3, 4]
    assert by_name["encoder.weight"].parameter_count == 12
    assert by_name["encoder.bias"].dtype == "float32"


@pytest.mark.parametrize("name", ["malicious.pt", "malicious.pth"])
def test_refuses_pickle_pytorch_extensions(tmp_path: Path, name: str) -> None:
    fake = tmp_path / name
    fake.write_bytes(b"not-a-real-checkpoint")
    with pytest.raises(UnsupportedModelFormatError, match="pickle"):
        extract_metadata(fake)
