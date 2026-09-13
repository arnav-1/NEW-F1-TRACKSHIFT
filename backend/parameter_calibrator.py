"""
TrackShift Practice Parameter Calibrator & Freeze Engine (backend/parameter_calibrator.py).

Calibrates physical wear parameter w_p1 against practice-inferred degradation rates
and FREEZES the model parameters before Sunday race start into an immutable JSON artifact.

Scientific Provenance:
- Parameter optimization against physical ODE: MATHEMATICAL TRANSFORMATION
- Calibration status FROZEN_PRE_RACE: Zero Sunday race data is permitted.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np

from backend.numerical_schemas import (
    CompoundParametersRecord,
    FrozenCalibrationRecord,
    ProvenanceTier,
)
from backend.physical_tyre_model import DEFAULT_COMPOUND_PARAMS, PhysicalTyreModel

logger = logging.getLogger("backend.parameter_calibrator")


class ParameterCalibrator:
    """
    Calibrates physical parameters and freezes the pre-race configuration.
    """

    def __init__(
        self,
        output_dir: Optional[Path] = None,
        model: Optional[PhysicalTyreModel] = None,
    ):
        self.output_dir = output_dir or (Path(__file__).resolve().parents[1] / "data")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.model = model or PhysicalTyreModel()

    def calibrate_compound_wear_parameter(
        self,
        target_deg_rate_s_lap: float,
        comp_params: CompoundParametersRecord,
        track_temp_c: float = 40.0,
        air_temp_c: float = 25.0,
    ) -> float:
        """
        Determines w_p1 so that forward ODE simulation over 1 lap reproduces target_deg_rate_s_lap.
        Uses analytical closed-form as initial estimate and bounded deterministic refinement.
        """
        # Analytical initial approximation:
        # Delta t_lap = k_pace_loss * lambda_wear * delta_D
        # delta_D = w_p1 * (Q_frict / Q_ref)^w_p2 * dt
        approx_w_p1 = target_deg_rate_s_lap / max(0.01, self.model.k_pace_loss * self.model.lambda_wear)

        # Bounded deterministic search in [0.005, 0.400]
        w_low = 0.005
        w_high = 0.400
        best_w = approx_w_p1

        # Binary search for exact forward match over 10 iterations
        for _ in range(12):
            w_mid = 0.5 * (w_low + w_high)
            test_params = CompoundParametersRecord(
                compound=comp_params.compound,
                t_opt=comp_params.t_opt,
                t_window=comp_params.t_window,
                t_tp_grain=comp_params.t_tp_grain,
                t_tp_blister=comp_params.t_tp_blister,
                base_mu0=comp_params.base_mu0,
                c_alpha_front=comp_params.c_alpha_front,
                w_p1=w_mid,
                w_p2=comp_params.w_p2,
                w_g1=comp_params.w_g1,
                w_g2=comp_params.w_g2,
                w_b1=comp_params.w_b1,
                w_b2=comp_params.w_b2,
            )

            # Test 1 lap simulation
            _, _, _, wear_rec, _ = self.model.simulate_lap_wear(
                t_tread_init_c=comp_params.t_opt,
                t_carc_init_c=comp_params.t_opt - 5.0,
                current_damage_d=0.0,
                comp_params=test_params,
                track_temp_c=track_temp_c,
                air_temp_c=air_temp_c,
            )
            sim_rate = wear_rec.pace_loss_s

            if abs(sim_rate - target_deg_rate_s_lap) < 0.001:
                best_w = w_mid
                break
            elif sim_rate < target_deg_rate_s_lap:
                w_low = w_mid
            else:
                w_high = w_mid
            best_w = w_mid

        return float(np.clip(best_w, 0.005, 0.350))

    def freeze_pre_race_calibration(
        self,
        circuit: str,
        year: int,
        fused_parameters: Dict[str, Dict[str, float]],
        nominal_weights: Dict[str, float],
        effective_weights: Dict[str, float],
        session_qualities: Dict[str, float],
        custom_filename: Optional[str] = None,
    ) -> FrozenCalibrationRecord:
        """
        Freezes physical parameters into an immutable JSON record before Sunday race day.
        """
        compounds_frozen: Dict[str, Dict[str, float]] = {}

        for comp, p in fused_parameters.items():
            base_comp = DEFAULT_COMPOUND_PARAMS.get(comp, DEFAULT_COMPOUND_PARAMS["MEDIUM"])
            target_rate = p.get("beta_1_per_lap", 0.075)

            calibrated_wp1 = self.calibrate_compound_wear_parameter(target_rate, base_comp)

            compounds_frozen[comp] = {
                "inferred_beta_0": float(p.get("beta_0", 0.05)),
                "inferred_beta_1": float(p.get("beta_1", target_rate * 15.0)),
                "inferred_beta_2": float(p.get("beta_2", 0.20)),
                "inferred_beta_1_per_lap": float(target_rate),
                "calibrated_w_p1": float(calibrated_wp1),
                "calibrated_w_p2": float(base_comp.w_p2),
                "t_opt": float(base_comp.t_opt),
                "t_window": float(base_comp.t_window),
                "base_mu0": float(base_comp.base_mu0),
                "c_alpha_front": float(base_comp.c_alpha_front),
            }

        # Generate deterministic timestamp hash
        hasher = hashlib.sha256()
        hasher.update(f"{circuit}_{year}_FROZEN".encode("utf-8"))
        hasher.update(str(sorted(compounds_frozen.items())).encode("utf-8"))
        ts_hash = hasher.hexdigest()[:16]

        record = FrozenCalibrationRecord(
            circuit=circuit,
            year=year,
            calibration_status="FROZEN_PRE_RACE",
            source_provenance="Deterministic Practice WOLS Fusion (FP1/FP2/FP3)",
            timestamp_hash=ts_hash,
            compounds=compounds_frozen,
            nominal_session_weights=nominal_weights,
            effective_session_weights=effective_weights,
            session_qualities=session_qualities,
        )

        filename = custom_filename or f"frozen_practice_calibration_{circuit.lower()}.json"
        out_path = self.output_dir / filename

        with open(out_path, "w") as f:
            json.dump(record.to_dict(), f, indent=2)

        # Also mirror to data/frozen_practice_calibrations.json as master
        master_path = self.output_dir / "frozen_practice_calibrations.json"
        with open(master_path, "w") as f:
            json.dump(record.to_dict(), f, indent=2)

        logger.info("Frozen calibration saved to: %s and %s", out_path, master_path)
        return record
