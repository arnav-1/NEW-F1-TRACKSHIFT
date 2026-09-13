"""
TrackShift Live Lap-by-Lap State Estimator (testDaksh/live_state_estimator.py).

Observer layer running during Sunday race execution:
- Decouples fuel burn (-0.033 s/kg) and measured dirty-air wake penalties.
- Tracks live tyre thermal state and cumulative damage D(k).
- Evaluates remaining stint life and pit window trigger codes:
    0 = EXTEND, 1 = WINDOW_OPEN, 2 = BOX_NOW.

Critical Scientific Requirement:
- Maintains complete isolation between PRE_RACE_FROZEN_STATE and LIVE_UPDATED_STATE.
- The frozen pre-race forecast is strictly immutable and never altered by live updates.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

from testDaksh.numerical_schemas import (
    CompoundParametersRecord,
    LiveLapStateRecord,
)
from testDaksh.physical_tyre_model import DEFAULT_COMPOUND_PARAMS, PhysicalTyreModel

logger = logging.getLogger("testDaksh.live_estimator")


class LiveStateEstimator:
    """
    Real-time observer for tracking live tyre condition during Grand Prix sessions.
    """

    def __init__(
        self,
        model: Optional[PhysicalTyreModel] = None,
        beta_fuel: float = 0.033,
    ):
        self.model = model or PhysicalTyreModel()
        self.beta_fuel = beta_fuel

        # Internal observer state
        self.current_tread_c = 95.0
        self.current_carc_c = 90.0
        self.current_damage = 0.0
        self.tyre_age = 0
        self.stint_number = 1
        self.current_compound = "SOFT"

    def reset_stint(self, compound: str, stint_number: int = 1):
        """Resets the observer upon fitting a fresh set of tyres in a pit stop."""
        self.current_compound = compound.upper()
        self.stint_number = stint_number
        self.tyre_age = 0
        self.current_damage = 0.0
        comp_params = DEFAULT_COMPOUND_PARAMS.get(self.current_compound, DEFAULT_COMPOUND_PARAMS["MEDIUM"])
        self.current_tread_c = comp_params.t_opt - 5.0
        self.current_carc_c = comp_params.t_opt - 10.0

    def step_live_lap(
        self,
        lap_number: int,
        observed_lap_time_s: float,
        base_lap_time_s: float,
        track_temp_c: float,
        air_temp_c: float,
        preceding_car_gap_s: Optional[float] = None,
        fuel_remaining_kg: float = 80.0,
        fuel_start_kg: float = 105.0,
    ) -> LiveLapStateRecord:
        """
        Advances the observer by 1 completed race lap.
        """
        self.tyre_age += 1
        comp_params = DEFAULT_COMPOUND_PARAMS.get(self.current_compound, DEFAULT_COMPOUND_PARAMS["MEDIUM"])

        # 1. Fuel correction decoupling: Delta t_fuel = -beta_fuel * (m_start - m_current)
        fuel_burned = max(0.0, fuel_start_kg - fuel_remaining_kg)
        fuel_correction_s = -self.beta_fuel * fuel_burned

        # 2. Dirty-air wake penalty: empirical aerodynamic downforce loss when following < 1.5s
        dirty_air_penalty_s = 0.0
        if preceding_car_gap_s is not None and 0.2 < preceding_car_gap_s <= 1.5:
            # Wake sliding penalty (loss of front downforce in turbulent air)
            dirty_air_penalty_s = float(0.45 * (1.5 - preceding_car_gap_s) / 1.3)

        # 3. Step physical ODE
        self.current_tread_c, self.current_carc_c, self.current_damage, wear_rec, _ = self.model.simulate_lap_wear(
            t_tread_init_c=self.current_tread_c,
            t_carc_init_c=self.current_carc_c,
            current_damage_d=self.current_damage,
            comp_params=comp_params,
            track_temp_c=track_temp_c,
            air_temp_c=air_temp_c,
            fuel_mass_kg=fuel_remaining_kg,
        )

        effective_mu = wear_rec.effective_mu
        pace_loss = wear_rec.pace_loss_s

        # 4. Driver pace delta: residual after removing tyre, fuel, and dirty air
        expected_lap_time = base_lap_time_s + pace_loss + fuel_correction_s + dirty_air_penalty_s
        driver_pace_delta_s = float(observed_lap_time_s - expected_lap_time)

        # 5. Diagnostic cliff and recommendation action code
        estimated_cliff_lap = 14 if self.current_compound == "SOFT" else (24 if self.current_compound == "MEDIUM" else 35)

        # Decision codes:
        # 0 = EXTEND, 1 = WINDOW_OPEN (within 2 laps of cliff), 2 = BOX_NOW (at/past cliff or damage > 0.80)
        if self.tyre_age >= estimated_cliff_lap or self.current_damage >= 0.80 or pace_loss >= 1.80:
            action_code = 2  # BOX_NOW
        elif self.tyre_age >= (estimated_cliff_lap - 2):
            action_code = 1  # WINDOW_OPEN
        else:
            action_code = 0  # EXTEND

        return LiveLapStateRecord(
            lap_number=lap_number,
            tyre_age=self.tyre_age,
            compound=self.current_compound,
            current_tread_temp_c=float(self.current_tread_c),
            current_carcass_temp_c=float(self.current_carc_c),
            current_damage=float(self.current_damage),
            current_effective_mu=float(effective_mu),
            live_lap_time_s=float(observed_lap_time_s),
            fuel_correction_s=float(fuel_correction_s),
            dirty_air_penalty_s=float(dirty_air_penalty_s),
            driver_pace_delta_s=float(driver_pace_delta_s),
            estimated_cliff_lap=estimated_cliff_lap,
            recommended_action_code=action_code,
        )
