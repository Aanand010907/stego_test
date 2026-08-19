from __future__ import annotations

import struct

import numpy as np
import pytest

from model_xray.analysis.bits import (
    binary_entropy,
    compute_bit_metrics,
    extract_bit_plane,
    extract_lsb,
    float32_to_uint32,
    float32_to_uint32_struct,
    local_regularity,
)
from model_xray.representation.grayscale_fourpart import split_float32_fourpart


def test_float32_bit_pattern_matches_struct() -> None:
    samples = np.array([0.0, 1.0, -1.0, 0.15625, 3.1415927], dtype=np.float32)
    viewed = float32_to_uint32(samples)
    for value, bits in zip(samples.tolist(), viewed.tolist(), strict=True):
        packed = struct.pack(">f", float(np.float32(value)))
        expected = struct.unpack(">I", packed)[0]
        assert int(bits) == expected
        assert float32_to_uint32_struct(value) == expected


def test_known_ieee754_patterns() -> None:
    one = np.array([1.0], dtype=np.float32)
    assert int(float32_to_uint32(one)[0]) == 0x3F800000
    paper = np.array([0.15625], dtype=np.float32)
    assert int(float32_to_uint32(paper)[0]) == 0x3E200000
    p0, p1, p2, p3 = split_float32_fourpart(one)
    assert p0[0] == 0x3F
    assert p1[0] == 0x80
    assert p2[0] == 0x00
    assert p3[0] == 0x00


def test_lsb_extraction_from_constructed_mantissa() -> None:
    odd = np.array([0x3F800001], dtype=np.uint32).view(np.float32)
    even = np.array([0x3F800000], dtype=np.uint32).view(np.float32)
    assert extract_lsb(odd)[0] == 1
    assert extract_lsb(even)[0] == 0
    msb = extract_bit_plane(float32_to_uint32(np.array([-1.0], dtype=np.float32)), 31)
    assert msb[0] == 1


def test_lsb_entropy_and_regularity() -> None:
    alternating = np.array([0x3F800000, 0x3F800001] * 32, dtype=np.uint32).view(np.float32)
    bits = extract_lsb(alternating)
    assert binary_entropy(bits) == pytest.approx(1.0)
    assert local_regularity(bits) == 0.0
    constant = np.ones(64, dtype=np.float32)
    metrics = compute_bit_metrics(constant)
    assert metrics.lsb_entropy == 0.0
    assert metrics.local_regularity == 1.0
    assert metrics.lsb_ones_ratio == 0.0
    assert len(metrics.bit_frequency) == 32
    assert len(metrics.bit_frequency_deviation) == 32
