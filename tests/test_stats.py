from __future__ import annotations

import numpy as np
import pytest

from model_xray.analysis.stats import compute_statistics, histogram_entropy, repeated_value_ratio


def test_compute_statistics_known_values() -> None:
    values = np.array([1.0, 2.0, 3.0, 4.0], dtype=np.float32)
    metrics = compute_statistics(values)
    expected_std = float(values.astype(np.float64).std(ddof=0))
    assert metrics.n_values == 4
    assert metrics.mean == pytest.approx(2.5)
    assert metrics.min == 1.0
    assert metrics.max == 4.0
    assert metrics.std == pytest.approx(expected_std)
    assert metrics.zero_ratio == 0.0
    assert metrics.near_zero_ratio == 0.0
    assert metrics.repeated_value_ratio == 0.0
    assert metrics.entropy > 0.0
    assert metrics.skewness == pytest.approx(0.0, abs=1e-12)


def test_zero_near_zero_and_repeats() -> None:
    values = np.array([0.0, 0.0, 1e-12, 1.0], dtype=np.float64)
    metrics = compute_statistics(values, near_zero=1e-8)
    assert metrics.zero_ratio == pytest.approx(0.5)
    assert metrics.near_zero_ratio == pytest.approx(0.75)
    assert repeated_value_ratio(values) == pytest.approx(0.25)
    assert metrics.repeated_value_ratio == pytest.approx(0.25)


def test_constant_array_entropy_and_moments() -> None:
    values = np.full(16, 3.14, dtype=np.float32)
    metrics = compute_statistics(values)
    assert metrics.entropy == 0.0
    assert metrics.std == 0.0
    assert metrics.skewness == 0.0
    assert metrics.kurtosis == 0.0
    assert histogram_entropy(values.astype(np.float64)) == 0.0
