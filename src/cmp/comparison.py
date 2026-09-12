"""
TrackShift Comparison & Management Platform (CMP).

This module implements the outer shell Comparison and Validation Platform:
1. Validates degradation models trained on practice sessions (FP1, FP2, FP3)
   against held-out Sunday Race stints.
2. Computes motorsport statistical metrics:
   - Mean Absolute Error (MAE)
   - Coefficient of Determination (R²)
   - Degradation slope error (Delta Slope)
   - Stint cliff prediction accuracy (within +/- 2 laps)
3. Parameterizes circuit archetypes (High Downforce/Abrasive, Low Downforce/Traction, Street Circuit)
   for cross-circuit generalization (Barcelona, Silverstone, Monza, Spa, Monaco).
4. Strictly enforces TrackShift Hackathon acceptance criteria:
   - Stint-end lap time MAE <= 0.5s
   - Held-out race stint R² >= 0.75
   - Degradation slope error <= 0.05 s/lap
   - Stint cliff prediction error <= +/- 2 laps

References:
    - West, E., & Limebeer, D. J. N. (2020). Optimal Tyre Management of a Formula One Car.
    - TrackShift Architecture & PRD: CMP Specification.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score

from src.dep.degradation import DegradationFitResult, CliffDetector

logger = logging.getLogger("trackshift.cmp")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [CMP] %(message)s", datefmt="%H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


@dataclass(frozen=True)
class CircuitProfile:
    """
    Physical and geometric characteristics of a Formula 1 circuit.

    Attributes:
        circuit_id: Short unique string key (e.g., 'barcelona', 'silverstone').
        name: Official venue name.
        archetype: Track classification ('high_downforce_abrasive', 'low_downforce_traction', 'street_circuit').
        direction: Layout heading ('clockwise' or 'anticlockwise').
        limiting_wheel: Primary critical tyre ('FL', 'FR', 'RL', 'RR').
        surface_abrasiveness: Tyre asphalt micro/macro-texture scalar (1.0 = baseline).
        length_m: Circuit centerline length in metres.
    """
    circuit_id: str
    name: str
    archetype: str
    direction: str
    limiting_wheel: str
    surface_abrasiveness: float
    length_m: float


# Canonical Formula 1 Circuit Archetype Profiles
CIRCUIT_PROFILES: Dict[str, CircuitProfile] = {
    "barcelona": CircuitProfile(
        circuit_id="barcelona",
        name="Circuit de Barcelona-Catalunya",
        archetype="high_downforce_abrasive",
        direction="clockwise",
        limiting_wheel="FL",
        surface_abrasiveness=1.25,
        length_m=4657.0,
    ),
    "catalunya": CircuitProfile(
        circuit_id="catalunya",
        name="Circuit de Barcelona-Catalunya",
        archetype="high_downforce_abrasive",
        direction="clockwise",
        limiting_wheel="FL",
        surface_abrasiveness=1.25,
        length_m=4657.0,
    ),
    "silverstone": CircuitProfile(
        circuit_id="silverstone",
        name="Silverstone Circuit",
        archetype="high_downforce_abrasive",
        direction="clockwise",
        limiting_wheel="FL",
        surface_abrasiveness=1.30,
        length_m=5891.0,
    ),
    "monza": CircuitProfile(
        circuit_id="monza",
        name="Autodromo Nazionale Monza",
        archetype="low_downforce_traction",
        direction="clockwise",
        limiting_wheel="RR",
        surface_abrasiveness=0.90,
        length_m=5793.0,
    ),
    "spa": CircuitProfile(
        circuit_id="spa",
        name="Circuit de Spa-Francorchamps",
        archetype="high_speed_lateral",
        direction="clockwise",
        limiting_wheel="FL",
        surface_abrasiveness=1.15,
        length_m=7004.0,
    ),
    "monaco": CircuitProfile(
        circuit_id="monaco",
        name="Circuit de Monaco",
        archetype="street_circuit",
        direction="clockwise",
        limiting_wheel="RR",
        surface_abrasiveness=0.65,
        length_m=3337.0,
    ),
}


@dataclass
class ValidationMetrics:
    """
    Quantitative accuracy metrics and acceptance criteria checks for held-out stint validation.
    """
    driver: str
    stint: int
    compound: str
    n_laps: int
    mae_s: float
    r_squared: float
    observed_slope_s_per_lap: float
    predicted_slope_s_per_lap: float
    slope_error_s_per_lap: float
    predicted_cliff_lap: Optional[float]
    actual_cliff_lap: Optional[float]
    cliff_error_laps: Optional[float]
    cliff_within_tolerance: bool  # |cliff_error| <= 2 laps

    # Strict TrackShift Hackathon Acceptance Criteria
    pass_mae: bool = False       # MAE <= 0.5s
    pass_r2: bool = False        # R² >= 0.75
    pass_slope: bool = False     # Slope error <= 0.05 s/lap
    all_criteria_met: bool = False

    def __post_init__(self):
        self.pass_mae = self.mae_s <= 0.50
        self.pass_r2 = self.r_squared >= 0.75
        self.pass_slope = self.slope_error_s_per_lap <= 0.05
        self.all_criteria_met = (
            self.pass_mae and self.pass_r2 and self.pass_slope and self.cliff_within_tolerance
        )


@dataclass
class StintComparisonReport:
    """Audit report comparing practice predictions with race ground truth."""
    circuit: CircuitProfile
    metrics: List[ValidationMetrics] = field(default_factory=list)
    overall_mae_s: float = 0.0
    overall_r2: float = 0.0
    cliff_accuracy_pct: float = 0.0
    strict_criteria_pass_pct: float = 0.0

    def summary_table(self) -> pd.DataFrame:
        """Converts validation metrics list into structured Pandas DataFrame."""
        records = []
        for m in self.metrics:
            records.append({
                "driver": m.driver,
                "stint": m.stint,
                "compound": m.compound,
                "n_laps": m.n_laps,
                "mae_s": round(m.mae_s, 3),
                "r2": round(m.r_squared, 3),
                "slope_obs": round(m.observed_slope_s_per_lap, 4),
                "slope_pred": round(m.predicted_slope_s_per_lap, 4),
                "slope_err": round(m.slope_error_s_per_lap, 4),
                "cliff_pred": round(m.predicted_cliff_lap, 1) if m.predicted_cliff_lap else None,
                "cliff_act": round(m.actual_cliff_lap, 1) if m.actual_cliff_lap else None,
                "cliff_err": round(m.cliff_error_laps, 1) if m.cliff_error_laps is not None else None,
                "cliff_pass": m.cliff_within_tolerance,
                "all_pass": m.all_criteria_met,
            })
        return pd.DataFrame(records)

    def summary_text(self) -> str:
        """Generates formatted string summary."""
        lines = [
            "============================================================",
            f"TrackShift Comparison & Management Platform (CMP): {self.circuit.name}",
            f"Archetype: {self.circuit.archetype} | Limiting: {self.circuit.limiting_wheel}",
            "============================================================",
            f"Stints Evaluated:          {len(self.metrics)}",
            f"Mean Absolute Error (MAE): {self.overall_mae_s:.3f} s (Target: <= 0.50s)",
            f"Mean R-Squared (R²):       {self.overall_r2:.3f} (Target: >= 0.75)",
            f"Cliff Accuracy (±2 laps):  {self.cliff_accuracy_pct:.1f}%",
            f"Strict Criteria Passed:    {self.strict_criteria_pass_pct:.1f}%",
            "============================================================",
        ]
        return "\n".join(lines)


class StintValidator:
    """
    Validates a degradation model fitted on practice sessions against an
    empirical Sunday race stint.
    """

    def __init__(
        self,
        cliff_detector: Optional[CliffDetector] = None,
        max_mae_threshold_s: float = 0.50,
        min_r2_threshold: float = 0.75,
        max_slope_error_s: float = 0.05,
    ):
        """Initializes validator with cliff detector and acceptance thresholds."""
        self.cliff_detector = cliff_detector or CliffDetector()
        self.max_mae_threshold_s = max_mae_threshold_s
        self.min_r2_threshold = min_r2_threshold
        self.max_slope_error_s = max_slope_error_s

    def validate_stint(
        self,
        practice_model: DegradationFitResult,
        race_stint_laps: pd.DataFrame,
        pace_column: str = "lap_time_fully_corrected_s",
    ) -> Optional[ValidationMetrics]:
        """
        Validates the practice-fitted model against a held-out race stint.
        """
        if len(race_stint_laps) < 4 or pace_column not in race_stint_laps.columns:
            return None

        t_obs = race_stint_laps["tyre_life"].to_numpy()
        y_obs = race_stint_laps[pace_column].to_numpy()

        # Adjust baseline pace offset to align start-of-stint pace (accounting for track/fuel shifts)
        deg_delta_pred = practice_model.predict_degradation_delta(t_obs)
        base_offset = float(np.median(y_obs - deg_delta_pred))
        y_pred = base_offset + deg_delta_pred

        # 1. MAE
        mae = float(mean_absolute_error(y_obs, y_pred))

        # 2. R²
        try:
            r2 = float(r2_score(y_obs, y_pred))
        except Exception:
            r2 = 0.0

        # 3. Slope Comparison
        poly_obs = np.polyfit(t_obs, y_obs, deg=1)
        slope_obs = float(poly_obs[0])
        poly_pred = np.polyfit(t_obs, y_pred, deg=1)
        slope_pred = float(poly_pred[0])
        slope_error = float(abs(slope_pred - slope_obs))

        # 4. Cliff Prediction Accuracy
        pred_cliff = practice_model.predicted_cliff_lap
        cliff_actual_res = self.cliff_detector.detect_cliff(
            tyre_age_laps=t_obs,
            observed_pace_s=y_obs,
        )
        actual_cliff = cliff_actual_res.cliff_lap if cliff_actual_res.cliff_detected else None

        cliff_error = None
        within_tol = False
        max_tyre_age = float(np.max(t_obs))

        if pred_cliff is not None and actual_cliff is not None:
            cliff_error = float(abs(pred_cliff - actual_cliff))
            within_tol = cliff_error <= 2.0
        elif pred_cliff is None and actual_cliff is None:
            within_tol = True
        elif pred_cliff is not None and actual_cliff is None:
            if pred_cliff > max_tyre_age:
                within_tol = True

        drv = str(race_stint_laps["driver"].iloc[0])
        stint_no = int(race_stint_laps["stint"].iloc[0])
        comp = str(race_stint_laps["compound"].iloc[0])

        return ValidationMetrics(
            driver=drv,
            stint=stint_no,
            compound=comp,
            n_laps=len(t_obs),
            mae_s=mae,
            r_squared=r2,
            observed_slope_s_per_lap=slope_obs,
            predicted_slope_s_per_lap=slope_pred,
            slope_error_s_per_lap=slope_error,
            predicted_cliff_lap=pred_cliff,
            actual_cliff_lap=actual_cliff,
            cliff_error_laps=cliff_error,
            cliff_within_tolerance=within_tol,
        )


class ComparisonPlatform:
    """
    Unified Comparison & Management Platform (CMP).

    Evaluates models trained on practice session data against held-out Sunday race stints,
    parameterized across circuit profiles.
    """

    def __init__(
        self,
        validator: Optional[StintValidator] = None,
        circuit: Union[str, CircuitProfile] = "barcelona",
    ):
        """
        Initializes Comparison Platform.

        Args:
            validator: StintValidator instance.
            circuit: CircuitProfile instance or circuit identifier string (default: 'barcelona').
        """
        self.validator = validator or StintValidator()
        if isinstance(circuit, str):
            c_key = circuit.lower().strip()
            self.circuit = CIRCUIT_PROFILES.get(c_key, CIRCUIT_PROFILES["barcelona"])
        else:
            self.circuit = circuit

    def compare_sessions(
        self,
        practice_dep_results: Dict[str, Any],
        race_cleaned_laps_df: pd.DataFrame,
        pace_column: str = "lap_time_fully_corrected_s",
    ) -> StintComparisonReport:
        """
        Runs validation across all matching race stints using practice models.
        """
        compound_models = practice_dep_results.get("compound_models", {})
        stint_fits = practice_dep_results.get("stint_fits", [])

        driver_compound_map: Dict[Tuple[str, str], DegradationFitResult] = {
            (f.driver, f.compound): f for f in stint_fits
        }

        metrics_list: List[ValidationMetrics] = []

        for (drv, stint_no, comp), group in race_cleaned_laps_df.groupby(
            ["driver", "stint", "compound"], sort=False
        ):
            if len(group) < 4:
                continue

            model = driver_compound_map.get((str(drv), str(comp)))
            if model is None:
                model = compound_models.get(str(comp))

            if model is None:
                continue

            val_metric = self.validator.validate_stint(
                practice_model=model,
                race_stint_laps=group,
                pace_column=pace_column,
            )
            if val_metric:
                metrics_list.append(val_metric)

        if not metrics_list:
            return StintComparisonReport(circuit=self.circuit)

        mean_mae = float(np.mean([m.mae_s for m in metrics_list]))
        mean_r2 = float(np.mean([m.r_squared for m in metrics_list]))
        cliff_passes = sum(1 for m in metrics_list if m.cliff_within_tolerance)
        cliff_pct = float(cliff_passes / len(metrics_list) * 100.0)

        all_pass_count = sum(1 for m in metrics_list if m.all_criteria_met)
        strict_pct = float(all_pass_count / len(metrics_list) * 100.0)

        report = StintComparisonReport(
            circuit=self.circuit,
            metrics=metrics_list,
            overall_mae_s=mean_mae,
            overall_r2=mean_r2,
            cliff_accuracy_pct=cliff_pct,
            strict_criteria_pass_pct=strict_pct,
        )

        logger.info(
            "CMP Validation completed for %s: %d stints | MAE: %.3fs | R²: %.3f | Cliff Acc: %.1f%%",
            self.circuit.name,
            len(metrics_list),
            mean_mae,
            mean_r2,
            cliff_pct,
        )

        return report
