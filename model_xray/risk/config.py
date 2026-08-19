"""Risk bands, component weights, and empirical baseline configuration.

Risk scores are normalized evidence aggregations [0, 100], strictly traceable
to empirical deviations from the clean reference baseline and few-shot detector
metric learning embeddings.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class RiskConfig(BaseModel):
    medium: float = Field(25.0, ge=0.0, le=100.0)
    high: float = Field(50.0, ge=0.0, le=100.0)
    critical: float = Field(75.0, ge=0.0, le=100.0)

    # Component weights in evidence aggregation
    weight_lsb_entropy: float = 0.15
    weight_local_regularity: float = 0.15
    weight_lsb_ones_ratio: float = 0.10
    weight_neighbor_lsb_correlation: float = 0.10
    weight_bit_frequency_deviation: float = 0.10
    weight_histogram_entropy: float = 0.05
    weight_embedding_affinity: float = 0.35

    # Robust anomaly z-score thresholds:
    # z <= z_threshold_start is normal (score=0)
    # z >= z_threshold_max is extreme outlier (score=100)
    z_threshold_start: float = 2.0
    z_threshold_max: float = 6.0

    @model_validator(mode="after")
    def ordered_thresholds(self) -> "RiskConfig":
        if not (self.medium < self.high < self.critical):
            raise ValueError("Require medium < high < critical")
        return self

    def weight_map(self) -> dict[str, float]:
        return {
            "lsb_entropy": self.weight_lsb_entropy,
            "local_regularity": self.weight_local_regularity,
            "lsb_ones_ratio": self.weight_lsb_ones_ratio,
            "neighbor_lsb_correlation": self.weight_neighbor_lsb_correlation,
            "bit_frequency_deviation": self.weight_bit_frequency_deviation,
            "histogram_entropy": self.weight_histogram_entropy,
            "embedding_affinity": self.weight_embedding_affinity,
        }

    def band_for(self, score: float) -> str:
        if score >= self.critical:
            return "CRITICAL"
        if score >= self.high:
            return "HIGH"
        if score >= self.medium:
            return "MEDIUM"
        return "LOW"
