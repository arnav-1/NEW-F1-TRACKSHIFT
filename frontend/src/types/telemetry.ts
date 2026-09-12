export interface TyreCornerState {
  workload_share: number;       // e.g. 0.362 for FL
  tread_temp_c: number;         // e.g. 112.4
  carcass_temp_c: number;       // e.g. 104.1
  abrasion_rate: number;        // e.g. 0.00014
  graining_rate: number;        // e.g. 0.0
  blistering_rate: number;      // e.g. 0.00008
  cumulative_damage: number;    // e.g. 0.245 (0 to 1)
  is_limiting: boolean;         // true for FL
}

export interface LapTelemetryPoint {
  lap_number: number;
  raw_lap_time: number;
  fuel_remaining_kg: number;
  fuel_penalty_s: number;
  track_evolution_s: number;
  pace_corrected_s: number;
  predicted_pace_s: number;
  limiting_corner: 'FL' | 'FR' | 'RL' | 'RR';
  corners: {
    FL: TyreCornerState;
    FR: TyreCornerState;
    RL: TyreCornerState;
    RR: TyreCornerState;
  };
  outlier_reason?: string | null; // e.g. 'Traffic Spike (> 2.5s)'
}

export interface StintValidationSummary {
  session_id: string;
  driver: string;
  compound: 'SOFT' | 'MEDIUM' | 'HARD';
  stint_laps: number;
  baseline_poly_mae: number;
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
