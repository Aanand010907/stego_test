from __future__ import annotations

import numpy as np
from scipy import stats

from model_xray.models.schemas import StatisticalMetrics

DEFAULT_NEAR_ZERO = 1e-8
ENTROPY_BINS = 256


def _finite(values: np.ndarray) -> np.ndarray:
    return values[np.isfinite(values)]


def histogram_entropy(values: np.ndarray, bins: int = ENTROPY_BINS) -> float:
    """Shannon entropy (bits) of a histogram approximation of the empirical density.

    Theoretical bounds: 0.0 <= H <= log2(bins) = 8.0 bits (for 256 bins).
    - Constant values: H = 0.0
    - Uniform distribution: H ≈ 8.0 bits
    - Gaussian / Natural model weights: H ≈ 4.5 to 7.8 bits depending on kurtosis.
    """
    values = _finite(np.asarray(values).reshape(-1))
    if values.size == 0:
        return 0.0
    vmin = float(values.min())
    vmax = float(values.max())
    if vmin == vmax or not np.isfinite(vmin) or not np.isfinite(vmax):
        return 0.0
    counts, _ = np.histogram(values, bins=bins, range=(vmin, vmax), density=False)
    probs = counts.astype(np.float64)
    total = probs.sum()
    if total <= 0:
        return 0.0
    probs /= total
    # Filter zero probabilities for exact numerical stability
    p_nonzero = probs[probs > 0]
    return float(-np.sum(p_nonzero * np.log2(p_nonzero)))


def repeated_value_ratio(values: np.ndarray) -> float:
    """Fraction of elements that are duplicates: (n - n_unique) / n."""
    n = int(values.size)
    if n == 0:
        return 0.0
    unique = np.unique(values)
    return float((n - unique.size) / n)


def compute_statistics(
    array: np.ndarray,
    *,
    near_zero: float = DEFAULT_NEAR_ZERO,
) -> StatisticalMetrics:
    """Per-tensor descriptive statistics used as steganalysis features."""
    values = np.asarray(array).reshape(-1).astype(np.float64, copy=False)
    values = _finite(values)
    n = int(values.size)
    if n == 0:
        return StatisticalMetrics(
            mean=0.0,
            std=0.0,
            min=0.0,
            max=0.0,
            skewness=0.0,
            kurtosis=0.0,
            entropy=0.0,
            zero_ratio=0.0,
            near_zero_ratio=0.0,
            repeated_value_ratio=0.0,
            n_values=0,
        )

    mean = float(values.mean())
    std = float(values.std(ddof=0))
    vmin = float(values.min())
    vmax = float(values.max())
    if n < 3 or std == 0.0:
        skewness = 0.0
        kurtosis = 0.0
    else:
        skewness = float(stats.skew(values, bias=True, nan_policy="omit"))
        kurtosis = float(stats.kurtosis(values, fisher=True, bias=True, nan_policy="omit"))
        if not np.isfinite(skewness):
            skewness = 0.0
        if not np.isfinite(kurtosis):
            kurtosis = 0.0

    abs_values = np.abs(values)
    zero_ratio = float(np.mean(abs_values == 0.0))
    near_zero_ratio = float(np.mean(abs_values < near_zero))

    return StatisticalMetrics(
        mean=mean,
        std=std,
        min=vmin,
        max=vmax,
        skewness=skewness,
        kurtosis=kurtosis,
        entropy=histogram_entropy(values),
        zero_ratio=zero_ratio,
        near_zero_ratio=near_zero_ratio,
        repeated_value_ratio=repeated_value_ratio(values),
        n_values=n,
    )
