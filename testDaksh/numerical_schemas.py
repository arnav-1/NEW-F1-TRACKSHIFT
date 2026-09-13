"""
TrackShift Numerical Schemas (testDaksh/numerical_schemas.py).

Strictly typed numerical and categorical dataclasses for the entire deterministic pipeline.
Zero LLM-generated strings, zero probabilistic distributions.
All data is serializable to typed JSON dictionaries.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ProvenanceTier(str, Enum):
    TIER_1 = "TIER_1_FIRST_PRINCIPLES"
    TIER_2 = "TIER_2_PUBLISHED_LITERATURE"
    TIER_3A = "TIER_3A_TRACKSHIFT_ENGINEERING_EXTENSION"
    TIER_3B = "TIER_3B_TRACKSHIFT_CALIBRATION_CHOICE"
    DIAGNOSTIC = "DIAGNOSTIC_METRIC"
    MATHEMATICAL_TRANSFORMATION = "MATHEMATICAL_TRANSFORMATION"


class SessionStatus(str, Enum):
    UPDATED = "UPDATED"
    RETAINED_PRIOR = "RETAINED_PRIOR"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    OUT_OF_BOUNDS = "OUT_OF_BOUNDS"


class LearningStatus(str, Enum):
    UPDATE_ACCEPTED = "UPDATE_ACCEPTED"
    UPDATE_REJECTED = "UPDATE_REJECTED"
    INSUFFICIENT_REPEATABILITY = "INSUFFICIENT_REPEATABILITY"
    OUT_OF_BOUNDS = "OUT_OF_BOUNDS"
    NO_IMPROVEMENT = "NO_IMPROVEMENT"


@dataclass
class CompoundParametersRecord:
    compound: str
    t_opt: float
    t_window: float
    t_tp_grain: float
    t_tp_blister: float
    base_mu0: float
    c_alpha_front: float
    w_p1: float
    w_p2: float
    w_g1: float
    w_g2: float
    w_b1: float
    w_b2: float
    provenance: str = ProvenanceTier.TIER_2.value

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ThermalStateRecord:
    t_tread_c: float
    t_carcass_c: float
    q_frict_w: float
    q_cond_w: float
    q_conv_w: float
    q_int_w: float
    q_defl_w: float
    q_rim_w: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class WearStateRecord:
    dot_w_p: float
    dot_w_g: float
    dot_w_b: float
    dot_w_total: float
    accumulated_d: float
    effective_mu: float
    pace_loss_s: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class HistoricalPriorRecord:
    global_parameters: Dict[str, float]
    compounds: Dict[str, Dict[str, float]]
    race_support_count: int
    circuit_support_count: int
    stint_support_count: int
    lap_support_count: int
    quality_score: float
    version: str = "2.0.0"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PracticeSessionUpdateRecord:
    circuit: str
    year: int
    session_name: str
    clean_laps_count: int
    clean_stints_count: int
    quality_score: float
    status: str
    compounds_inferred: Dict[str, Dict[str, float]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FrozenCalibrationRecord:
    circuit: str
    year: int
    calibration_status: str
    source_provenance: str
    timestamp_hash: str
    compounds: Dict[str, Dict[str, float]]
    nominal_session_weights: Dict[str, float]
    effective_session_weights: Dict[str, float]
    session_qualities: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StintPredictionRecord:
    compound: str
    stint_length: int
    lap_numbers: List[int]
    tread_temps_c: List[float]
    carcass_temps_c: List[float]
    accumulated_damage: List[float]
    effective_mu: List[float]
    predicted_pace_loss_s: List[float]
    predicted_lap_times_s: List[float]
    beta_0: float
    beta_1: float
    beta_2: float
    beta_1_per_lap: float
    analytical_cliff_lap: int
    economic_crossover_lap: int
    safety_floor_lap: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RacePredictionRecord:
    circuit: str
    year: int
    total_race_laps: int
    predictions: Dict[str, StintPredictionRecord]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LiveLapStateRecord:
    lap_number: int
    tyre_age: int
    compound: str
    current_tread_temp_c: float
    current_carcass_temp_c: float
    current_damage: float
    current_effective_mu: float
    live_lap_time_s: float
    fuel_correction_s: float
    dirty_air_penalty_s: float
    driver_pace_delta_s: float
    estimated_cliff_lap: int
    recommended_action_code: int  # 0=EXTEND, 1=WINDOW_OPEN, 2=BOX_NOW

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StrategyOptimizationRecord:
    circuit: str
    race_distance_laps: int
    starting_compound: str
    compound_sequence: List[str]
    compound_sequence_ids: List[int]  # 1=HARD, 2=MEDIUM, 3=SOFT
    stint_lengths: List[int]
    pit_laps: List[int]
    pit_windows: List[List[int]]
    predicted_total_race_time_s: float
    pit_time_loss_total_s: float
    constraints_satisfied: int
    safety_margin_pct: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RaceInferenceRecord:
    circuit: str
    year: int
    driver: str
    stint_number: int
    compound: str
    stint_length: int
    lap_numbers: List[int]
    observed_lap_times_s: List[float]
    fuel_corrected_degradation_s: List[float]
    beta_0: float
    beta_1: float
    beta_2: float
    beta_1_per_lap: float
    sample_variance: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GripValidationRecord:
    circuit: str
    year: int
    driver: str
    stint_number: int
    compound: str
    sample_points_count: int
    correlation: float
    rmse: float
    mae: float
    relative_bias: float
    trend_agreement_pct: float
    status_code: int  # 0=SUCCESS, 1=INSUFFICIENT_TELEMETRY, 2=OUT_OF_RANGE

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PostRaceScorecardRecord:
    circuit: str
    year: int
    driver: str
    stint_number: int
    compound: str
    stint_length: int
    centered_shape_mae_s: float
    physical_mae_s: float
    slope_error_ms_per_lap: float
    predicted_pit_lap: int
    actual_pit_lap: int
    pit_window_error_laps: int
    pit_captured_within_2l: bool
    telemetry_grip: Optional[GripValidationRecord] = None

    def to_dict(self) -> Dict[str, Any]:
        res = asdict(self)
        return res


@dataclass
class ParameterLearningUpdateRecord:
    target_circuit: str
    source_circuit: str
    compound: str
    parameter_name: str
    old_value: float
    inferred_value: float
    updated_value: float
    acceptance_status: str
    repeatability_evidence_count: int
    walk_forward_improvement_pct: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
