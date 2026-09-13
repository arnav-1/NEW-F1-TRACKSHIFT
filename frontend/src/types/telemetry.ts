export type TyreStatus = 'OPTIMAL' | 'GRAINING_RISK' | 'OVERHEATING';

export interface TyreCornerMetrics {
  corner: 'FL' | 'FR' | 'RL' | 'RR';
  workload_share: number;        // e.g. 0.362 for FL
  tread_temp_c: number;          // e.g. 112.4
  carcass_temp_c: number;        // e.g. 104.1
  abrasion_rate: number;         // e.g. 0.00014
  graining_rate: number;         // e.g. 0.0
  blistering_rate: number;       // e.g. 0.00008
  cumulative_damage: number;     // e.g. 0.245 (0.0 to 1.0)
  damage?: number;               // alias matching telemetry_export.json
  is_limiting: boolean;          // true for FL at Barcelona
  status: TyreStatus;
}

export interface LapTelemetryRecord {
  lap_number: number;
  tyre_life: number;
  raw_lap_time: number;
  fuel_remaining_kg: number;
  fuel_penalty_s: number;
  track_evolution_s: number;
  pace_corrected_s: number;
  predicted_pace_s: number;
  is_outlier: boolean;
  outlier_reason?: string | null;
  pip_filter_tag?: 'PASS_GREEN' | 'REJECTED_TRAFFIC_SPIKE' | 'REJECTED_VSC_DELTA' | 'REJECTED_YELLOW_FLAG' | 'OUT_LAP' | string;
  corners: Record<'FL' | 'FR' | 'RL' | 'RR', TyreCornerMetrics>;
}

export interface CompoundTelemetryData {
  stint_number: number;
  total_laps: number;
  limiting_corner: string;
  limiting_workload_pct: number;
  fitted_alpha: number;
  fitted_beta: number;
  predicted_cliff_lap: number;
  laps: LapTelemetryRecord[];
}

export interface BenchmarkRecord {
  stint: string;
  grand_prix?: string;
  compound: string;
  raw_compound?: string;
  laps: number;
  poly_mae: number | string;
  trackshift_mae: number | string;
  slope_error: number | string;
  verdict?: string;
  status: 'PASSED' | 'FAILED' | string;
}

export interface CircuitBenchmarkSummary {
  circuit: string;
  stints: number;
  mean_slope_error_ms: number;
  median_mae_s: number;
  slope_fidelity_ratio: number;
}

export interface BaselineModelsComparison {
  mean_mae_baseline0_constant: number;
  mean_mae_baseline1_linear: number;
  mean_mae_baseline2_compound_quad: number;
  mean_mae_trackshift_physical: number;
  mean_centered_shape_mae: number;
  shape_superiority_pct: number;
}

export interface ConfidenceTierCalibration {
  stint_count: number;
  centered_shape_mae_s: number;
  mean_mae_s: number;
  coverage_pct: number;
}

export interface OperationalDecisionSummary {
  total_stints_evaluated: number;
  pit_window_accuracy_pct: number;
  mean_pit_window_error_laps: number;
  compound_preference_fidelity_pct: number;
  safe_stint_margin_laps: number;
  odd_valid_pct: number;
  odd_degraded_pct: number;
  odd_invalid_pct: number;
  pit_window_error_histogram?: Array<{ error_laps: number; stints: number }>;
  compound_concordance_matrix?: Array<{ predicted: string; Soft: number; Medium: number; Hard: number }>;
  safe_stint_margins?: Array<{ stint: string; margin: number }>;
  circuit_compound_ranking_accuracy?: Array<{ circuit: string; accuracy: number }>;
}

export interface EngineeringDiagnostics {
  parameter_sensitivity: Array<{ param: string; short: string; index: number; color?: string }>;
  perturbation_matrix: Array<{ test: string; delta_slope_ms: number; threshold_ms: number }>;
  degradation_phases: Array<{ phase: string; short: string; range: string; mae: number; desc: string }>;
  decision_attribution: Array<{ driver: string; laps: number; color: string }>;
  telemetric_grip: {
    correlation_r: number;
    ccc: number;
    mae_mu: number;
    slope: number;
    turn: string;
  };
}

export interface PostRaceValidationData {
  calibration_status: string;
  methodology: string;
  held_out_validation_target: string;
  total_stints_evaluated: number;
  prediction_interval_coverage_pct: number;
  circuits_benchmarked: string[];
  circuits_benchmarked_summary?: CircuitBenchmarkSummary[];
  baseline_models_comparison: BaselineModelsComparison;
  confidence_calibration: Record<'HIGH' | 'MEDIUM' | 'LOW' | string, ConfidenceTierCalibration>;
  failure_taxonomy_distribution: Record<string, number>;
  operational_decision_summary: OperationalDecisionSummary;
  failure_distribution_by_circuit_type?: Array<{ type: string; mae: number }>;
  engineering_diagnostics?: EngineeringDiagnostics;
}

export interface SessionWeather {
  track_temp_c: number;
  air_temp_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  condition: string;
}

export interface CircuitInfo {
  id: CircuitId;
  name: string;
  country: string;
  flag: string;
  length_km: number;
  turns: number;
  limiting_wheel: 'FL' | 'FR' | 'RL' | 'RR';
  limiting_wheel_name: string;
  archetype: string;
}

export interface SessionRecommendation {
  title: string;
  stage: 'FP1_BASELINE' | 'FP2_UPDATE' | 'FP3_FREEZE' | 'RACE_LIVE' | 'POST_RACE_AUDIT';
  model_weights: { FP1: number; FP2: number; FP3: number };
  recommended_primary_compound: 'SOFT' | 'MEDIUM' | 'HARD';
  optimal_strategy: string;
  pit_windows: Array<{
    stint_number: number;
    compound: string;
    pit_lap_target: number;
    window_open: number;
    window_close: number;
  }>;
  compound_degradation_slopes_s_lap: Record<'SOFT' | 'MEDIUM' | 'HARD' | string, number>;
  calibrated_wear_wp1: Record<'SOFT' | 'MEDIUM' | 'HARD' | string, number>;
  predicted_cliff_laps: Record<'SOFT' | 'MEDIUM' | 'HARD' | string, number>;
  crossover_laps: { soft_to_medium: number; medium_to_hard: number };
  confidence_score: number;
  confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  key_observation: string;
  actionable_decision: string;
  post_race_metrics?: {
    centered_shape_mae_s: number;
    physical_mae_s: number;
    pit_accuracy_pct: number;
    continual_learning_delta_pct: number;
  };
}

export interface CircuitSession {
  session_name: string;
  weather: SessionWeather;
  compounds: Record<string, CompoundTelemetryData>;
  recommendation?: SessionRecommendation;
}

export interface CircuitDataset {
  circuit_info: CircuitInfo;
  sessions: Record<string, CircuitSession>;
}

export interface TelemetryExportSchema {
  circuit_id?: string;
  circuit: string;
  driver: string;
  driver_number: number;
  chassis: string;
  circuits?: Record<string, CircuitDataset>;
  sessions: Record<string, CircuitSession>;
  benchmarks: BenchmarkRecord[];
  post_race_validation?: PostRaceValidationData;
}

export interface StintBenchmark {
  circuit: string;
  compound: 'SOFT' | 'MEDIUM' | 'HARD';
  laps_completed: number;
  poly_baseline_mae: number;
  trackshift_physical_mae: number;
  slope_error: number;
  r_squared: number;
  cliff_lap_predicted: number;
  cliff_lap_actual: number;
  status: 'PASSED' | 'FAILED';
}

export interface AblationConfig {
  aeroDeficit: number;             // Default 0.88
  massSquaredScaling: boolean;     // Default true
  paceManagementPush: number;      // Default 0.94
}

export type CircuitId = 'spain' | 'silverstone' | 'austria' | 'belgium';
export type WheelId = 'FL' | 'FR' | 'RL' | 'RR' | 'ALL';
export type SessionId = 'FP1' | 'FP2' | 'FP3' | 'Race';
export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD';


