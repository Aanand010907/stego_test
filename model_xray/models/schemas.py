from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class PipelineStage(str, Enum):
    QUEUED = "QUEUED"
    VALIDATION = "VALIDATION"
    HASHING = "HASHING"
    METADATA_EXTRACTION = "METADATA_EXTRACTION"
    STATISTICAL_ANALYSIS = "STATISTICAL_ANALYSIS"
    BIT_LEVEL_ANALYSIS = "BIT_LEVEL_ANALYSIS"
    FOURPART_REPRESENTATION = "FOURPART_REPRESENTATION"
    DETECTOR_INFERENCE = "DETECTOR_INFERENCE"
    RISK_EVALUATION = "RISK_EVALUATION"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class StageStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class StageInfo(BaseModel):
    stage: PipelineStage
    name: str
    status: StageStatus = StageStatus.PENDING
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: float | None = None
    message: str | None = None


class TensorMetadata(BaseModel):
    name: str
    shape: list[int]
    dtype: str
    parameter_count: int


class ModelMetadata(BaseModel):
    path: str
    sha256: str
    file_size_bytes: int
    tensor_count: int
    parameter_count: int
    dtype_distribution: dict[str, int] = Field(
        description="Parameter counts grouped by safetensors dtype name."
    )
    tensor_dtype_counts: dict[str, int] = Field(
        description="Number of tensors grouped by dtype."
    )
    tensors: list[TensorMetadata]
    file_metadata: dict[str, str] = Field(
        default_factory=dict,
        description="SafeTensors header __metadata__ strings (labels, notices).",
    )


class StatisticalMetrics(BaseModel):
    mean: float
    std: float
    min: float
    max: float
    skewness: float
    kurtosis: float
    entropy: float
    zero_ratio: float
    near_zero_ratio: float
    repeated_value_ratio: float
    n_values: int


class BitLevelMetrics(BaseModel):
    lsb_entropy: float
    lsb_ones_ratio: float
    bit_frequency: list[float]
    bit_frequency_deviation: list[float]
    mean_bit_frequency_deviation: float
    local_regularity: float
    neighbor_weight_correlation: float | None
    neighbor_lsb_correlation: float | None


class LayerAnalysis(BaseModel):
    name: str
    dtype: str
    shape: list[int]
    parameter_count: int
    statistics: StatisticalMetrics | None = None
    bit_level: BitLevelMetrics | None = None
    notes: list[str] = Field(default_factory=list)


class ScoreComponent(BaseModel):
    """One risk term. Weights are analyst-configured, not learned."""

    name: str
    measured_value: float | None
    measured_unit: str
    reference_range: list[float] | None = None
    component_score: float
    weight: float
    weighted_contribution: float
    formula: str


class Finding(BaseModel):
    indicator: str
    scope: str
    observed_value: float | None
    reference_range: list[float] | None = None
    interpretation: str
    recommended_action: str
    related_component: str | None = None


class DetectorResult(BaseModel):
    predicted_label: str
    method: str
    embedding_dim: int
    distance_to_clean_centroid: float | None = None
    distance_to_suspicious_centroid: float | None = None
    nearest_label: str | None = None
    nearest_distance: float | None = None
    nearest_reference: str | None = None
    notes: list[str] = Field(default_factory=list)


class RiskAssessment(BaseModel):
    score: float
    band: str  # LOW, MEDIUM, HIGH, CRITICAL
    components: list[ScoreComponent]
    findings: list[Finding]
    thresholds: dict[str, float]


class ModelScanResult(BaseModel):
    metadata: ModelMetadata
    layers: list[LayerAnalysis]
    grayscale_fourpart_path: str | None = None
    grayscale_fourpart_shape: list[int] | None = None
    detector: DetectorResult | None = None
    risk: RiskAssessment | None = None
    deferred: dict[str, Any] = Field(default_factory=dict)


class ScanJob(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    sha256: str | None = None
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    current_stage: PipelineStage = PipelineStage.QUEUED
    progress: int = 0  # 0 to 100
    stages: list[StageInfo] = Field(default_factory=list)
    created_at: str
    completed_at: str | None = None
    duration_sec: float | None = None
    is_demo: bool = False
    demo_sample_id: str | None = None
    model_arch: str | None = None
    risk_score: float | None = None
    risk_band: str | None = None
    error_message: str | None = None
    result: ModelScanResult | None = None
    fourpart_image_url: str | None = None


class ScanCreateResponse(BaseModel):
    scan_id: str
    status: str
    filename: str
    is_demo: bool
    created_at: str
    message: str


class DemoModelOption(BaseModel):
    id: str
    filename: str
    name: str
    label: str  # clean / suspicious
    architecture: str
    embedding_rate_percent: float
    n_lsb_randomized: int
    description: str
    expected_verdict: str


class DashboardStats(BaseModel):
    total_scans: int
    clean_count: int
    suspicious_count: int
    risk_distribution: dict[str, int]
    average_duration_sec: float
    recent_scans: list[dict[str, Any]]


class DifferentialLayerDiff(BaseModel):
    layer_name: str
    parameter_count: int
    altered_parameter_count: int
    altered_fraction: float
    l2_distance: float
    max_absolute_diff: float
    altered_bit_positions: list[int] = Field(default_factory=list)
    min_altered_bit: int | None = None
    max_altered_bit: int | None = None


class DifferentialScanResult(BaseModel):
    reference_model: str
    reference_sha256: str
    candidate_model: str
    candidate_sha256: str
    total_parameters: int
    total_altered_parameters: int
    altered_parameter_fraction: float
    altered_layers_count: int
    total_layers_count: int
    layers: list[DifferentialLayerDiff]
    tampering_evidence: str
    differential_risk_score: float
    differential_risk_band: str
