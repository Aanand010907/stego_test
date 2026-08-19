from __future__ import annotations

import json
import struct
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

import numpy as np
from safetensors import safe_open

from model_xray.ingestion.hashing import sha256_file
from model_xray.models.schemas import ModelMetadata, TensorMetadata

PICKLE_SUFFIXES = {".pt", ".pth", ".pkl", ".pickle", ".bin"}

SAFETENSORS_DTYPE_TO_NUMPY = {
    "F64": "float64",
    "F32": "float32",
    "F16": "float16",
    "BF16": "bfloat16",
    "I64": "int64",
    "I32": "int32",
    "I16": "int16",
    "I8": "int8",
    "U8": "uint8",
    "U16": "uint16",
    "U32": "uint32",
    "U64": "uint64",
    "BOOL": "bool",
}


class UnsupportedModelFormatError(ValueError):
    """Raised when a format is refused or not implemented in this phase."""


def refuse_unsafe_or_unknown(path: Path) -> None:
    suffix = path.suffix.lower()
    if suffix in PICKLE_SUFFIXES:
        raise UnsupportedModelFormatError(
            f"Refusing to load {path.name} ({suffix}). PyTorch .pt/.pth and other "
            "pickle-based formats can execute arbitrary code on deserialization. "
            "This tool only parses SafeTensors (.safetensors). Pickle ingestion is "
            "deferred for this security reason."
        )
    if suffix != ".safetensors":
        raise UnsupportedModelFormatError(
            f"Unsupported model format {suffix!r}. Only .safetensors is accepted."
        )


def parse_safetensors_header(path: str | Path) -> tuple[dict[str, Any], dict[str, str]]:
    """Parse the SafeTensors JSON header without loading tensor payloads."""
    path = Path(path)
    with path.open("rb") as handle:
        header_len_bytes = handle.read(8)
        if len(header_len_bytes) != 8:
            raise UnsupportedModelFormatError("File is too small to be SafeTensors.")
        (header_len,) = struct.unpack("<Q", header_len_bytes)
        raw = handle.read(header_len)
        if len(raw) != header_len:
            raise UnsupportedModelFormatError("Truncated SafeTensors header.")
    header = json.loads(raw)
    file_metadata = header.pop("__metadata__", None) or {}
    return header, {str(k): str(v) for k, v in dict(file_metadata).items()}


def read_safetensors_header(path: str | Path) -> dict[str, Any]:
    header, _metadata = parse_safetensors_header(path)
    return header


def load_safetensors(path: str | Path) -> dict[str, np.ndarray]:
    path = Path(path)
    refuse_unsafe_or_unknown(path)
    tensors: dict[str, np.ndarray] = {}
    with safe_open(str(path), framework="np") as handle:
        for name in handle.keys():
            tensors[name] = handle.get_tensor(name)
    return tensors


def iter_tensors(path: str | Path) -> Iterator[tuple[str, np.ndarray]]:
    path = Path(path)
    refuse_unsafe_or_unknown(path)
    with safe_open(str(path), framework="np") as handle:
        for name in handle.keys():
            yield name, handle.get_tensor(name)


def extract_metadata(path: str | Path) -> ModelMetadata:
    path = Path(path)
    refuse_unsafe_or_unknown(path)
    header, file_metadata = parse_safetensors_header(path)

    tensors_meta: list[TensorMetadata] = []
    dtype_params: Counter[str] = Counter()
    dtype_tensors: Counter[str] = Counter()
    parameter_count = 0

    for name, spec in header.items():
        st_dtype = str(spec["dtype"])
        dtype = SAFETENSORS_DTYPE_TO_NUMPY.get(st_dtype, st_dtype.lower())
        shape = [int(d) for d in spec["shape"]]
        n_params = int(np.prod(shape, dtype=np.int64)) if shape else 1
        tensors_meta.append(
            TensorMetadata(
                name=name,
                shape=shape,
                dtype=dtype,
                parameter_count=n_params,
            )
        )
        dtype_params[dtype] += n_params
        dtype_tensors[dtype] += 1
        parameter_count += n_params

    return ModelMetadata(
        path=str(path.resolve()),
        sha256=sha256_file(path),
        file_size_bytes=path.stat().st_size,
        tensor_count=len(tensors_meta),
        parameter_count=int(parameter_count),
        dtype_distribution=dict(dtype_params),
        tensor_dtype_counts=dict(dtype_tensors),
        tensors=tensors_meta,
        file_metadata=file_metadata,
    )
