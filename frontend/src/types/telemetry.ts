export interface TyreCornerMetrics {
  corner: 'FL' | 'FR' | 'RL' | 'RR';
  workload_share: number;        // e.g. 0.362 for FL
  tread_temp_c: number;          // e.g. 112.4
  carcass_temp_c: number;        // e.g. 104.1
  abrasion_rate: number;         // e.g. 0.00014
  graining_rate: number;         // e.g. 0.0
  blistering_rate: number;       // e.g. 0.00008
  cumulative_damage: number;     // e.g. 0.245 (0.0 to 1.0)
  is_limiting: boolean;          // true for FL at Barcelona
  status: 'OPTIMAL' | 'GRAINING_RISK' | 'OVERHEATING';
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
  corners: Record<'FL' | 'FR' | 'RL' | 'RR', TyreCornerMetrics>;
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

export type CircuitId = 'barcelona' | 'silverstone';
export type SessionId = 'FP1' | 'FP2' | 'FP3' | 'Race';
export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD';
