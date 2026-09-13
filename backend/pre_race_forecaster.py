"""
TrackShift Pre-Race Forward Forecaster (backend/pre_race_forecaster.py).

Executes deterministic forward simulation of Sunday race stints for each available dry compound
using strictly FROZEN practice parameters. Zero Sunday race data is ingested.

Outputs:
- StintPredictionRecord: thermal state, wear integral D(k), effective grip mu(k), pace loss,
  and diagnostic cliff/crossover thresholds.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

from backend.numerical_schemas import (
    CompoundParametersRecord,
    FrozenCalibrationRecord,
    RacePredictionRecord,
    StintPredictionRecord,
)
from backend.physical_tyre_model import PhysicalTyreModel

logger = logging.getLogger("backend.pre_race_forecaster")


class PreRaceForecaster:
    """
    Deterministic forward simulator for Sunday Grand Prix predictions.
    """

    def __init__(
        self,
        model: Optional[PhysicalTyreModel] = None,
        output_dir: Optional[Path] = None,
    ):
        self.model = model or PhysicalTyreModel()
        self.output_dir = output_dir or (Path(__file__).resolve().parents[1] / "data" / "pre_race_predictions")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def forecast_compound_stint(
        self,
        compound: str,
        frozen_params: Dict[str, float],
        max_laps: int = 40,
        track_temp_c: float = 42.0,
        air_temp_c: float = 26.0,
        base_lap_time_s: float = 80.0,
        initial_fuel_kg: float = 105.0,
    ) -> StintPredictionRecord:
        """
        Simulates forward a single compound stint over max_laps.
        """
        comp_record = CompoundParametersRecord(
            compound=compound,
            t_opt=frozen_params.get("t_opt", 100.0),
            t_window=frozen_params.get("t_window", 18.0),
            t_tp_grain=88.0,
            t_tp_blister=125.0,
            base_mu0=frozen_params.get("base_mu0", 1.45),
            c_alpha_front=frozen_params.get("c_alpha_front", 145000.0),
            w_p1=frozen_params.get("calibrated_w_p1", 0.035),
            w_p2=frozen_params.get("calibrated_w_p2", 1.15),
            w_g1=0.0006,
            w_g2=1.40,
            w_b1=0.0008,
            w_b2=1.50,
        )

        lap_nums: List[int] = []
        tread_temps: List[float] = []
        carcass_temps: List[float] = []
        damages: List[float] = []
        mus: List[float] = []
        pace_losses: List[float] = []
        lap_times: List[float] = []

        t_tread = comp_record.t_opt - 5.0
        t_carc = comp_record.t_opt - 10.0
        damage = 0.0

        cliff_lap = max_laps
        crossover_lap = max_laps
        safety_lap = max_laps

        for lap_idx in range(max_laps):
            lap_no = lap_idx + 1
            fuel_rem = max(5.0, initial_fuel_kg - 1.60 * lap_idx)
            fuel_burn = initial_fuel_kg - fuel_rem
            fuel_benefit_s = 0.033 * fuel_burn

            t_tread, t_carc, damage, wear_rec, _ = self.model.simulate_lap_wear(
                t_tread_init_c=t_tread,
                t_carc_init_c=t_carc,
                current_damage_d=damage,
                comp_params=comp_record,
                track_temp_c=track_temp_c,
                air_temp_c=air_temp_c,
                fuel_mass_kg=fuel_rem,
            )

            pace_loss = wear_rec.pace_loss_s
            pred_lap_time = base_lap_time_s + pace_loss - fuel_benefit_s

            lap_nums.append(lap_no)
            tread_temps.append(float(t_tread))
            carcass_temps.append(float(t_carc))
            damages.append(float(damage))
            mus.append(float(wear_rec.effective_mu))
            pace_losses.append(float(pace_loss))
            lap_times.append(float(pred_lap_time))

            # Diagnostics:
            # 1. Economic crossover: Delta t_deg >= 1.80 s
            if pace_loss >= 1.80 and crossover_lap == max_laps:
                crossover_lap = lap_no

            # 2. Safety floor: Damage D >= 0.85 (15% tread remaining)
            if damage >= 0.85 and safety_lap == max_laps:
                safety_lap = lap_no

        # 3. Analytical Cliff from polynomial derivative: d(PaceLoss)/d(lap) >= 0.20 s/lap
        poly = np.polyfit(np.arange(len(pace_losses)), pace_losses, deg=2)
        b2, b1, b0 = float(poly[0]), float(poly[1]), float(poly[2])
        if b2 > 1e-5:
            cliff_calc = int((0.20 - b1) / (2.0 * b2))
            cliff_lap = max(5, min(max_laps, cliff_calc))
        else:
            cliff_lap = crossover_lap

        b1_lap = b1 / max(1.0, float(max_laps - 1))

        return StintPredictionRecord(
            compound=compound,
            stint_length=max_laps,
            lap_numbers=lap_nums,
            tread_temps_c=tread_temps,
            carcass_temps_c=carcass_temps,
            accumulated_damage=damages,
            effective_mu=mus,
            predicted_pace_loss_s=pace_losses,
            predicted_lap_times_s=lap_times,
            beta_0=b0,
            beta_1=b1,
            beta_2=b2,
            beta_1_per_lap=b1_lap,
            analytical_cliff_lap=cliff_lap,
            economic_crossover_lap=crossover_lap,
            safety_floor_lap=safety_lap,
        )

    def forecast_race_weekend(
        self,
        frozen_calibration: FrozenCalibrationRecord,
        total_race_laps: int = 66,
        track_temp_c: float = 42.0,
        air_temp_c: float = 26.0,
        base_lap_time_s: float = 80.0,
    ) -> RacePredictionRecord:
        """
        Generates full Sunday forecast across all calibrated compounds.
        """
        stint_predictions: Dict[str, StintPredictionRecord] = {}

        for comp, p in frozen_calibration.compounds.items():
            stint_pred = self.forecast_compound_stint(
                compound=comp,
                frozen_params=p,
                max_laps=min(total_race_laps, 45),
                track_temp_c=track_temp_c,
                air_temp_c=air_temp_c,
                base_lap_time_s=base_lap_time_s,
            )
            stint_predictions[comp] = stint_pred

        record = RacePredictionRecord(
            circuit=frozen_calibration.circuit,
            year=frozen_calibration.year,
            total_race_laps=total_race_laps,
            predictions=stint_predictions,
        )

        out_path = self.output_dir / f"pre_race_prediction_{frozen_calibration.circuit.lower()}.json"
        with open(out_path, "w") as f:
            json.dump(record.to_dict(), f, indent=2)

        logger.info("Pre-race forecast saved to: %s", out_path)
        return record
