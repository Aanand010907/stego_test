"""Combine bit-level, statistical, and embedding evidence into a 0–100 risk score."""

from __future__ import annotations

import numpy as np

from model_xray.analysis.bits import compute_bit_metrics
from model_xray.analysis.stats import compute_statistics
from model_xray.models.schemas import (
    DetectorResult,
    Finding,
    LayerAnalysis,
    RiskAssessment,
    ScoreComponent,
)
from model_xray.reporting.explain import action_for_band, finding
from model_xray.risk.baseline import (
    EmpiricalCleanBaseline,
    compute_robust_anomaly_score,
    load_baseline,
)
from model_xray.risk.config import RiskConfig


def _clamp01(value: float) -> float:
    return float(min(1.0, max(0.0, value)))


def concat_float32(tensors: dict[str, np.ndarray]) -> np.ndarray | None:
    parts = [
        np.ascontiguousarray(array, dtype=np.float32).reshape(-1)
        for array in tensors.values()
        if np.dtype(array.dtype) == np.dtype(np.float32)
    ]
    if not parts:
        return None
    return np.concatenate(parts)


def _renormalize(weights: dict[str, float], active: list[str]) -> dict[str, float]:
    subset = {name: weights.get(name, 0.0) for name in active if weights.get(name, 0.0) > 0}
    total = sum(subset.values())
    if total <= 0:
        even = 1.0 / len(active) if active else 0.0
        return {name: even for name in active}
    return {name: subset.get(name, 0.0) / total for name in active}


def score_risk(
    *,
    tensors: dict[str, np.ndarray],
    layers: list[LayerAnalysis],
    detector: DetectorResult | None = None,
    config: RiskConfig | None = None,
    baseline: EmpiricalCleanBaseline | None = None,
) -> RiskAssessment:
    """Calculate deterministic risk score [0, 100] from empirical baseline deviations."""
    config = config or RiskConfig()
    baseline = baseline or load_baseline()
    weights = config.weight_map()

    bits = None
    stats = None
    concat = concat_float32(tensors)
    if concat is not None:
        bits = compute_bit_metrics(concat)
        stats = compute_statistics(concat)

    components: list[ScoreComponent] = []
    findings: list[Finding] = []

    def add_component(
        name: str,
        measured: float | None,
        unit: str,
        ref: list[float] | None,
        score: float,
        formula: str,
        weight: float,
    ) -> None:
        contrib = weight * score
        components.append(
            ScoreComponent(
                name=name,
                measured_value=measured,
                measured_unit=unit,
                reference_range=ref,
                component_score=round(score, 6),
                weight=round(weight, 6),
                weighted_contribution=round(contrib, 6),
                formula=formula,
            )
        )

    active = [
        "lsb_entropy",
        "local_regularity",
        "lsb_ones_ratio",
        "neighbor_lsb_correlation",
        "bit_frequency_deviation",
        "histogram_entropy",
    ]
    if detector is not None and detector.distance_to_clean_centroid is not None:
        active.append("embedding_affinity")
    norm = _renormalize(weights, active)

    # 1. Statistical & Bit-plane metrics vs. Empirical Clean Baseline
    if bits is not None and stats is not None:
        # (a) LSB Entropy
        dist_entropy = baseline.get_distribution("lsb_entropy")
        if dist_entropy:
            score_ent, z_ent = compute_robust_anomaly_score(
                bits.lsb_entropy, dist_entropy,
                z_threshold_start=config.z_threshold_start,
                z_threshold_max=config.z_threshold_max,
            )
            ref_range = [dist_entropy.p5, dist_entropy.p95]
            formula_ent = (
                f"Robust MAD deviation: z={z_ent:.2f} (median={dist_entropy.median:.4f}, "
                f"MAD={dist_entropy.mad:.4f}); score={score_ent:.1f}"
            )
        else:
            score_ent, z_ent = 0.0, 0.0
            ref_range = [0.99, 1.00]
            formula_ent = "baseline unavailable; score := 0"

        add_component(
            "lsb_entropy",
            bits.lsb_entropy,
            "bits",
            ref_range,
            score_ent,
            formula_ent,
            norm["lsb_entropy"],
        )

        # (b) Local Regularity
        dist_reg = baseline.get_distribution("local_regularity")
        if dist_reg:
            score_reg, z_reg = compute_robust_anomaly_score(
                bits.local_regularity, dist_reg,
                z_threshold_start=config.z_threshold_start,
                z_threshold_max=config.z_threshold_max,
            )
            ref_reg = [dist_reg.p5, dist_reg.p95]
            formula_reg = (
                f"Robust MAD deviation: z={z_reg:.2f} (median={dist_reg.median:.4f}, "
                f"MAD={dist_reg.mad:.4f}); score={score_reg:.1f}"
            )
        else:
            score_reg, z_reg = 0.0, 0.0
            ref_reg = [0.49, 0.51]
            formula_reg = "baseline unavailable; score := 0"

        add_component(
            "local_regularity",
            bits.local_regularity,
            "fraction",
            ref_reg,
            score_reg,
            formula_reg,
            norm["local_regularity"],
        )

        # (c) LSB Ones Ratio
        dist_ones = baseline.get_distribution("lsb_ones_ratio")
        if dist_ones:
            score_ones, z_ones = compute_robust_anomaly_score(
                bits.lsb_ones_ratio, dist_ones,
                z_threshold_start=config.z_threshold_start,
                z_threshold_max=config.z_threshold_max,
            )
            ref_ones = [dist_ones.p5, dist_ones.p95]
            formula_ones = (
                f"Robust MAD deviation: z={z_ones:.2f} (median={dist_ones.median:.4f}, "
                f"MAD={dist_ones.mad:.4f}); score={score_ones:.1f}"
            )
        else:
            score_ones, z_ones = 0.0, 0.0
            ref_ones = [0.49, 0.51]
            formula_ones = "baseline unavailable; score := 0"

        add_component(
            "lsb_ones_ratio",
            bits.lsb_ones_ratio,
            "fraction",
            ref_ones,
            score_ones,
            formula_ones,
            norm["lsb_ones_ratio"],
        )

        # (d) Neighbor LSB Correlation
        corr = bits.neighbor_lsb_correlation
        dist_corr = baseline.get_distribution("neighbor_lsb_correlation")
        if corr is not None and dist_corr:
            score_corr, z_corr = compute_robust_anomaly_score(
                corr, dist_corr,
                z_threshold_start=config.z_threshold_start,
                z_threshold_max=config.z_threshold_max,
            )
            ref_corr = [dist_corr.p5, dist_corr.p95]
            formula_corr = (
                f"Robust MAD deviation: z={z_corr:.2f} (median={dist_corr.median:.4f}, "
                f"MAD={dist_corr.mad:.4f}); score={score_corr:.1f}"
            )
        else:
            score_corr = 0.0
            ref_corr = [-0.01, 0.01]
            formula_corr = "correlation structured or unmeasured; score := 0"

        add_component(
            "neighbor_lsb_correlation",
            corr,
            "pearson_r",
            ref_corr,
            score_corr,
            formula_corr,
            norm["neighbor_lsb_correlation"],
        )

        # (e) Mean Bit Frequency Deviation
        dist_bfd = baseline.get_distribution("bit_frequency_deviation_mean")
        if dist_bfd:
            score_bfd, z_bfd = compute_robust_anomaly_score(
                bits.mean_bit_frequency_deviation, dist_bfd,
                z_threshold_start=config.z_threshold_start,
                z_threshold_max=config.z_threshold_max,
            )
            ref_bfd = [dist_bfd.p5, dist_bfd.p95]
            formula_bfd = (
                f"Robust MAD deviation: z={z_bfd:.2f} (median={dist_bfd.median:.4f}, "
                f"MAD={dist_bfd.mad:.4f}); score={score_bfd:.1f}"
            )
        else:
            score_bfd = 0.0
            ref_bfd = [0.10, 0.30]
            formula_bfd = "baseline unavailable; score := 0"

        add_component(
            "bit_frequency_deviation",
            bits.mean_bit_frequency_deviation,
            "deviation_from_0.5",
            ref_bfd,
            score_bfd,
            formula_bfd,
            norm["bit_frequency_deviation"],
        )

        # (f) Weight Value Histogram Entropy
        dist_he = baseline.get_distribution("weight_value_histogram_entropy")
        if dist_he:
            score_he, z_he = compute_robust_anomaly_score(
                stats.entropy, dist_he,
                z_threshold_start=config.z_threshold_start,
                z_threshold_max=config.z_threshold_max,
            )
            ref_he = [dist_he.p5, dist_he.p95]
            formula_he = (
                f"Robust MAD deviation: z={z_he:.2f} (median={dist_he.median:.4f}, "
                f"MAD={dist_he.mad:.4f}); score={score_he:.1f}"
            )
        else:
            score_he = 0.0
            ref_he = [4.5, 8.0]
            formula_he = "baseline unavailable; score := 0"

        add_component(
            "histogram_entropy",
            stats.entropy,
            "bits",
            ref_he,
            score_he,
            formula_he,
            norm["histogram_entropy"],
        )

    # 2. Embedding Affinity (Few-Shot Distance-based classification)
    if "embedding_affinity" in norm and detector is not None:
        d0 = detector.distance_to_clean_centroid
        d1 = detector.distance_to_suspicious_centroid
        if d0 is None or d1 is None:
            affinity = 0.0
            formula = "centroid distances unavailable; affinity := 0"
            measured = None
        else:
            denom = d0 + d1
            affinity = 0.0 if denom <= 0 else d0 / denom
            measured = affinity
            formula = (
                "affinity = d_clean / (d_clean + d_suspicious); "
                f"d_clean={d0:.4f}, d_suspicious={d1:.4f}; "
                "component_score = 100 * affinity"
            )
        add_component(
            "embedding_affinity",
            measured,
            "distance_ratio",
            [0.0, 0.50],
            100.0 * affinity,
            formula,
            norm["embedding_affinity"],
        )

    # Total Score calculation
    total = float(sum(c.weighted_contribution for c in components))
    total = float(min(100.0, max(0.0, total)))
    band = config.band_for(total)

    # Generate Explainable Findings
    if bits is not None:
        findings.append(
            finding(
                indicator="model_lsb_entropy",
                scope="model (concatenated float32)",
                observed_value=bits.lsb_entropy,
                reference_range=ref_range if "ref_range" in locals() else None,
                interpretation=(
                    f"LSB Shannon entropy is {bits.lsb_entropy:.4f}. "
                    "In trained neural networks, mantissa LSB entropy is naturally near 1.00. "
                    "Anomaly scoring assesses deviation against the empirical clean baseline."
                ),
                band=band,
                related_component="lsb_entropy",
            )
        )
        findings.append(
            finding(
                indicator="model_local_lsb_regularity",
                scope="model (concatenated float32)",
                observed_value=bits.local_regularity,
                reference_range=ref_reg if "ref_reg" in locals() else None,
                interpretation=(
                    f"Adjacent-LSB equality rate is {bits.local_regularity:.4f}. "
                    "Natural weight bitstreams exhibit ~0.50 equality."
                ),
                band=band,
                related_component="local_regularity",
            )
        )

    if stats is not None:
        findings.append(
            finding(
                indicator="weight_value_histogram_entropy",
                scope="model (concatenated float32)",
                observed_value=stats.entropy,
                reference_range=ref_he if "ref_he" in locals() else None,
                interpretation=(
                    f"Histogram entropy of weight values is {stats.entropy:.3f} bits. "
                    "Assesses macroscopic weight density distribution."
                ),
                band=band,
                related_component="histogram_entropy",
            )
        )

    if detector is not None:
        findings.append(
            finding(
                indicator="few_shot_embedding_distance",
                scope="model Grayscale-Fourpart image",
                observed_value=detector.distance_to_clean_centroid,
                reference_range=[0.0, 0.50],
                interpretation=(
                    f"CNN metric embedding classified candidate as '{detector.predicted_label}'. "
                    f"Distance to clean centroid={detector.distance_to_clean_centroid:.4f}, "
                    f"to suspicious centroid={detector.distance_to_suspicious_centroid:.4f}."
                ),
                band=band,
                related_component="embedding_affinity",
            )
        )

    return RiskAssessment(
        score=round(total, 4),
        band=band,
        components=components,
        findings=findings,
        thresholds={
            "medium": config.medium,
            "high": config.high,
            "critical": config.critical,
        },
    )


def recommended_action(assessment: RiskAssessment) -> str:
    return action_for_band(assessment.band)
