from __future__ import annotations

import struct

import numpy as np

from model_xray.models.schemas import BitLevelMetrics

N_FLOAT32_BITS = 32


def float32_to_uint32(array: np.ndarray) -> np.ndarray:
    """IEEE-754 bit patterns as uint32 via a NumPy dtype view (endian-correct)."""
    flat = np.ascontiguousarray(array, dtype=np.float32).reshape(-1)
    return flat.view(np.uint32)


def float32_to_uint32_struct(value: float) -> int:
    """Single-value bit pattern via struct (big-endian IEEE-754), for tests/cross-checks."""
    packed = struct.pack(">f", np.float32(value))
    return int(struct.unpack(">I", packed)[0])


def extract_bit_plane(uint_bits: np.ndarray, bit_index: int) -> np.ndarray:
    """bit_index 0 is the LSB, 31 is the MSB (sign bit of float32)."""
    if not 0 <= bit_index < N_FLOAT32_BITS:
        raise ValueError(f"bit_index must be in [0, {N_FLOAT32_BITS})")
    return ((uint_bits >> int(bit_index)) & np.uint32(1)).astype(np.uint8)


def extract_lsb(array: np.ndarray) -> np.ndarray:
    return extract_bit_plane(float32_to_uint32(array), 0)


def binary_entropy(bits: np.ndarray) -> float:
    """Shannon entropy of a Bernoulli bit sequence, in bits (max 1.0)."""
    if bits.size == 0:
        return 0.0
    p = float(np.mean(bits.astype(np.float64)))
    if p <= 0.0 or p >= 1.0:
        return 0.0
    return float(-p * np.log2(p) - (1.0 - p) * np.log2(1.0 - p))


def bit_frequencies(uint_bits: np.ndarray) -> np.ndarray:
    """P(bit=1) for each of the 32 positions, LSB first."""
    if uint_bits.size == 0:
        return np.zeros(N_FLOAT32_BITS, dtype=np.float64)
    freqs = np.empty(N_FLOAT32_BITS, dtype=np.float64)
    ones = uint_bits.astype(np.uint32, copy=False)
    n = float(ones.size)
    for bit in range(N_FLOAT32_BITS):
        freqs[bit] = float(np.count_nonzero((ones >> np.uint32(bit)) & np.uint32(1))) / n
    return freqs


def local_regularity(bits: np.ndarray) -> float:
    """Fraction of adjacent pairs with equal bits (1.0 = perfectly regular)."""
    if bits.size < 2:
        return 1.0
    equal = bits[:-1] == bits[1:]
    return float(np.mean(equal))


def _pearson(a: np.ndarray, b: np.ndarray) -> float | None:
    if a.size < 2 or b.size < 2:
        return None
    if float(a.std()) == 0.0 or float(b.std()) == 0.0:
        return None
    corr = np.corrcoef(a.astype(np.float64), b.astype(np.float64))[0, 1]
    if not np.isfinite(corr):
        return None
    return float(corr)


def compute_bit_metrics(array: np.ndarray) -> BitLevelMetrics:
    """Bit-plane steganalysis features for float32 weights (LSB-focused)."""
    uint_bits = float32_to_uint32(array)
    lsb = extract_bit_plane(uint_bits, 0)
    freqs = bit_frequencies(uint_bits)
    deviation = np.abs(freqs - 0.5)
    weights = np.ascontiguousarray(array, dtype=np.float32).reshape(-1)

    neighbor_w = None
    neighbor_lsb = None
    if weights.size >= 2:
        neighbor_w = _pearson(weights[:-1], weights[1:])
        neighbor_lsb = _pearson(lsb[:-1].astype(np.float64), lsb[1:].astype(np.float64))

    return BitLevelMetrics(
        lsb_entropy=binary_entropy(lsb),
        lsb_ones_ratio=float(lsb.mean()) if lsb.size else 0.0,
        bit_frequency=freqs.tolist(),
        bit_frequency_deviation=deviation.tolist(),
        mean_bit_frequency_deviation=float(deviation.mean()) if deviation.size else 0.0,
        local_regularity=local_regularity(lsb),
        neighbor_weight_correlation=neighbor_w,
        neighbor_lsb_correlation=neighbor_lsb,
    )
