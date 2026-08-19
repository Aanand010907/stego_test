"""Grayscale-Fourpart weight-space representation.

Faithful implementation of Gilkarov & Dubin (arXiv:2409.19310, Section III-B, Algorithm 3).

Methodology:
1. Every IEEE-754 32-bit floating-point weight w is split into four 8-bit byte planes:
   - Plane 0 (MSB): Sign bit + 7 exponent bits (b31..b24)
   - Plane 1: Remaining 1 exponent bit + 7 mantissa bits (b23..b16)
   - Plane 2: Intermediate 8 mantissa bits (b15..b8)
   - Plane 3 (LSB): Lowest 8 mantissa bits (b7..b0)
2. Each plane is reshaped into a square matrix of size ceil(sqrt(N)) x ceil(sqrt(N)).
3. Concatenation:
   - For Feature Extraction / Research CNN: 4 planes are concatenated.
   - For Security Console UI Visualization: Stood in a 2x2 composite [[P0, P1], [P2, P3]].
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from model_xray.analysis.bits import float32_to_uint32


def split_float32_fourpart(array: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Split each float32 into four uint8 planes (MSB → LSB), per Algorithm 3.

    For weight w = b31...b0:
      p0 = b31...b24 (Sign + high exponent)
      p1 = b23...b16 (Low exponent + high mantissa)
      p2 = b15...b8  (Mid mantissa)
      p3 = b7...b0   (Least-significant mantissa bytes)
    """
    bits = float32_to_uint32(array)
    p0 = ((bits >> np.uint32(24)) & np.uint32(0xFF)).astype(np.uint8)
    p1 = ((bits >> np.uint32(16)) & np.uint32(0xFF)).astype(np.uint8)
    p2 = ((bits >> np.uint32(8)) & np.uint32(0xFF)).astype(np.uint8)
    p3 = (bits & np.uint32(0xFF)).astype(np.uint8)
    return p0, p1, p2, p3


def plane_to_square(plane: np.ndarray) -> np.ndarray:
    """Pad uint8 plane to the nearest square matrix."""
    n = int(plane.size)
    if n == 0:
        return np.zeros((1, 1), dtype=np.uint8)
    side = int(np.ceil(np.sqrt(n)))
    pad = side * side - n
    if pad:
        plane = np.pad(plane, (0, pad), mode="constant", constant_values=0)
    return plane.reshape(side, side)


def composite_fourpart(planes: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]) -> np.ndarray:
    """Stack four square grayscale planes into a 2×2 UI visualization: [[I0, I1], [I2, I3]]."""
    squares = [plane_to_square(p) for p in planes]
    top = np.concatenate([squares[0], squares[1]], axis=1)
    bottom = np.concatenate([squares[2], squares[3]], axis=1)
    return np.concatenate([top, bottom], axis=0)


def composite_fourpart_horizontal(planes: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]) -> np.ndarray:
    """Horizontal 1x4 concatenation [I0, I1, I2, I3] per standard linear byte-plane layout."""
    squares = [plane_to_square(p) for p in planes]
    return np.concatenate(squares, axis=1)


def grayscale_fourpart(array: np.ndarray) -> np.ndarray:
    """Generate 2x2 Grayscale-Fourpart composite representation."""
    return composite_fourpart(split_float32_fourpart(array))


def grayscale_fourpart_from_weight_dict(tensors: dict[str, np.ndarray]) -> np.ndarray | None:
    """Concatenate float32 tensors in stable order then build Grayscale-Fourpart."""
    parts: list[np.ndarray] = []
    for name in sorted(tensors.keys()):
        array = tensors[name]
        if np.dtype(array.dtype) == np.dtype(np.float32):
            parts.append(np.ascontiguousarray(array, dtype=np.float32).reshape(-1))
    if not parts:
        return None
    return grayscale_fourpart(np.concatenate(parts))


def save_grayscale_png(
    image: np.ndarray,
    path: str | Path,
    *,
    max_side: int | None = None,
) -> Path:
    """Save 2D uint8 grayscale composite image to PNG."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    arr = np.ascontiguousarray(image, dtype=np.uint8)
    pil = Image.fromarray(arr, mode="L")
    if max_side is not None and max(pil.size) > max_side:
        pil = pil.resize((max_side, max_side), resample=Image.Resampling.NEAREST)
    pil.save(path, format="PNG")
    return path
