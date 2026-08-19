export type PipelineStage =
  | "QUEUED"
  | "VALIDATION"
  | "HASHING"
  | "METADATA_EXTRACTION"
  | "STATISTICAL_ANALYSIS"
  | "BIT_LEVEL_ANALYSIS"
  | "FOURPART_REPRESENTATION"
  | "DETECTOR_INFERENCE"
  | "RISK_EVALUATION"
  | "COMPLETED"
  | "FAILED";

export type StageStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface StageInfo {
  stage: PipelineStage;
  name: string;
  status: StageStatus;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  message?: string;
}

export interface TensorMetadata {
  name: string;
  shape: number[];
  dtype: string;
  parameter_count: number;
}

export interface ModelMetadata {
  path: string;
  sha256: string;
  file_size_bytes: number;
  tensor_count: number;
  parameter_count: number;
  dtype_distribution: Record<string, number>;
  tensor_dtype_counts: Record<string, number>;
  tensors: TensorMetadata[];
  file_metadata: Record<string, string>;
}

export interface StatisticalMetrics {
  mean: number;
  std: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  entropy: number;
  zero_ratio: number;
  near_zero_ratio: number;
  repeated_value_ratio: number;
  n_values: number;
}

export interface BitLevelMetrics {
  lsb_entropy: number;
  lsb_ones_ratio: number;
  bit_frequency: number[];
  bit_frequency_deviation: number[];
  mean_bit_frequency_deviation: number;
  local_regularity: number;
  neighbor_weight_correlation?: number;
  neighbor_lsb_correlation?: number;
}

export interface LayerAnalysis {
  name: string;
  dtype: string;
  shape: number[];
  parameter_count: number;
  statistics?: StatisticalMetrics;
  bit_level?: BitLevelMetrics;
  notes: string[];
}

export interface ScoreComponent {
  name: string;
  measured_value?: number;
  measured_unit: string;
  reference_range?: [number, number];
  component_score: number;
  weight: number;
  weighted_contribution: number;
  formula: string;
}

export interface Finding {
  indicator: string;
  scope: string;
  observed_value?: number;
  reference_range?: [number, number];
  interpretation: string;
  recommended_action: string;
  related_component?: string;
}

export interface DetectorResult {
  predicted_label: string;
  method: string;
  embedding_dim: number;
  distance_to_clean_centroid?: number;
  distance_to_suspicious_centroid?: number;
  nearest_label?: string;
  nearest_distance?: number;
  nearest_reference?: string;
  notes: string[];
}

export interface RiskAssessment {
  score: number;
  band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  components: ScoreComponent[];
  findings: Finding[];
  thresholds: Record<string, number>;
}

export interface ModelScanResult {
  metadata: ModelMetadata;
  layers: LayerAnalysis[];
  grayscale_fourpart_path?: string;
  grayscale_fourpart_shape?: number[];
  detector?: DetectorResult;
  risk?: RiskAssessment;
  deferred: Record<string, any>;
}

export interface ScanJob {
  id: string;
  filename: string;
  file_size_bytes: number;
  sha256?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  current_stage: PipelineStage;
  progress: number;
  stages: StageInfo[];
  created_at: string;
  completed_at?: string;
  duration_sec?: number;
  is_demo: boolean;
  demo_sample_id?: string;
  model_arch?: string;
  risk_score?: number;
  risk_band?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  error_message?: string;
  result?: ModelScanResult;
  fourpart_image_url?: string;
}

export interface DemoModelOption {
  id: string;
  filename: string;
  name: string;
  label: "clean" | "suspicious";
  architecture: string;
  embedding_rate_percent: number;
  n_lsb_randomized: number;
  description: string;
  expected_verdict: string;
}

export interface DashboardStats {
  total_scans: number;
  clean_count: number;
  suspicious_count: number;
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  average_duration_sec: number;
  recent_scans: Array<{
    id: string;
    filename: string;
    created_at: string;
    status: string;
    risk_band?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    risk_score?: number;
    model_arch?: string;
    is_demo: boolean;
    duration_sec?: number;
  }>;
}
