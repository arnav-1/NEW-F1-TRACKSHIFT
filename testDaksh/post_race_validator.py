"""
TrackShift Independent Post-Race Validator (testDaksh/post_race_validator.py).

Performs rigorous, non-circular post-race auditing comparing the frozen pre-race forecast
against independently reconstructed Sunday race stints:
1. Centered Shape MAE (s): removes static pace offset to measure pure degradation curvature.
2. Physical MAE (s): end-to-end uncentered lap time prediction error.
3. Degradation Slope Error (ms/lap): |beta_1,pred - beta_1,race| * 1000.
4. Pit Window Accuracy: captures whether actual pit stop occurred within +/- 2 laps.
5. Independent Telemetric Grip Validation.

Zero Data Leakage: Sunday race observations are never used to modify the frozen forecast.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from testDaksh.numerical_schemas import (
    GripValidationRecord,
    PostRaceScorecardRecord,
    RaceInferenceRecord,
    StintPredictionRecord,
)
from testDaksh.practice_degradation_inferer import PracticeDegradationInferer
from testDaksh.stint_reconstructor import StintReconstructor
from testDaksh.telemetric_grip_validator import TelemetricGripValidator

logger = logging.getLogger("testDaksh.post_race_validator")


class PostRaceValidator:
    """
    Independent post-race audit suite.
    """

    def __init__(
        self,
        output_dir: Optional[Path] = None,
        grip_validator: Optional[TelemetricGripValidator] = None,
    ):
        self.output_dir = output_dir or (Path(__file__).resolve().parents[1] / "data" / "post_race_validation")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.reconstructor = StintReconstructor(beta_fuel=0.033, min_stint_laps=5)
        self.inferer = PracticeDegradationInferer()
        self.grip_validator = grip_validator or TelemetricGripValidator()

    def compute_centered_shape_mae(
        self,
        y_pred: np.ndarray,
        y_obs: np.ndarray,
    ) -> float:
        """
        Removes static baseline level from both series and evaluates shape MAE:
        MAE_shape = mean( | (y_pred - mean(y_pred)) - (y_obs - mean(y_obs)) | )
        """
        if len(y_pred) == 0 or len(y_obs) == 0:
            return 0.0
        n = min(len(y_pred), len(y_obs))
        p = y_pred[:n]
        o = y_obs[:n]

        p_centered = p - np.mean(p)
        o_centered = o - np.mean(o)
        return float(np.mean(np.abs(p_centered - o_centered)))

    def compute_physical_mae(
        self,
        y_pred: np.ndarray,
        y_obs: np.ndarray,
    ) -> float:
        """
        Evaluates uncentered end-to-end MAE:
        MAE_phys = mean( | y_pred - y_obs | )
        """
        if len(y_pred) == 0 or len(y_obs) == 0:
            return 0.0
        n = min(len(y_pred), len(y_obs))
        return float(np.mean(np.abs(y_pred[:n] - y_obs[:n])))

    def audit_race_stint(
        self,
        circuit: str,
        year: int,
        driver: str,
        stint_number: int,
        stint_df: pd.DataFrame,
        predicted_stint: StintPredictionRecord,
        actual_pit_lap: int,
        telemetry_apex_speeds: Optional[List[float]] = None,
    ) -> PostRaceScorecardRecord:
        """
        Audits a single completed Sunday race stint against pre-race forecast.
        """
        comp = str(stint_df["compound"].iloc[0]).upper()
        n_laps = len(stint_df)

        obs_pace_loss = stint_df["degradation_obs_s"].values
        pred_pace_loss = np.array(predicted_stint.predicted_pace_loss_s[:n_laps])

        # If pred series is shorter than obs, pad with last value
        if len(pred_pace_loss) < n_laps:
            last_val = pred_pace_loss[-1] if len(pred_pace_loss) > 0 else 1.0
            pad = np.full(n_laps - len(pred_pace_loss), last_val)
            pred_pace_loss = np.concatenate([pred_pace_loss, pad])

        # 1. Centered Shape MAE
        shape_mae = self.compute_centered_shape_mae(pred_pace_loss, obs_pace_loss)

        # 2. Physical MAE
        phys_mae = self.compute_physical_mae(pred_pace_loss, obs_pace_loss)

        # 3. Independent race WOLS inference
        a_norm = stint_df["normalized_age"].values
        b0_race, b1_race, b2_race, _ = self.inferer.fit_stint_wols(a_norm, obs_pace_loss)
        b1_lap_race = b1_race / max(1.0, float(n_laps - 1))

        # Slope Error in ms/lap
        slope_error_ms = abs(predicted_stint.beta_1_per_lap - b1_lap_race) * 1000.0

        # 4. Pit window accuracy
        pred_pit = predicted_stint.economic_crossover_lap
        pit_err = abs(pred_pit - actual_pit_lap)
        captured_2l = pit_err <= 2

        # 5. Independent Telemetric Grip Validation
        grip_rec = None
        if telemetry_apex_speeds:
            grip_rec = self.grip_validator.validate_grip_trajectory(
                circuit=circuit,
                year=year,
                driver=driver,
                stint_number=stint_number,
                compound=comp,
                model_mu_trajectory=predicted_stint.effective_mu[:n_laps],
                telemetry_apex_speeds_ms=telemetry_apex_speeds,
            )

        scorecard = PostRaceScorecardRecord(
            circuit=circuit,
            year=year,
            driver=driver,
            stint_number=stint_number,
            compound=comp,
            stint_length=n_laps,
            centered_shape_mae_s=float(shape_mae),
            physical_mae_s=float(phys_mae),
            slope_error_ms_per_lap=float(slope_error_ms),
            predicted_pit_lap=int(pred_pit),
            actual_pit_lap=int(actual_pit_lap),
            pit_window_error_laps=int(pit_err),
            pit_captured_within_2l=bool(captured_2l),
            telemetry_grip=grip_rec,
        )

        out_path = self.output_dir / f"scorecard_{circuit.lower()}_{driver}_stint{stint_number}.json"
        with open(out_path, "w") as f:
            json.dump(scorecard.to_dict(), f, indent=2)

        return scorecard
