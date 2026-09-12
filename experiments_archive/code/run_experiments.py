"""
testDaksh: Cross-Race Multi-Session Experiment Runner for Haas F1 (Nico Hülkenberg).

Executes the physical-to-observational degradation pipeline across:
  - Track 1: 2024 Spanish Grand Prix (Barcelona)
  - Track 2: 2024 British Grand Prix (Silverstone)

Uses combined FP1 + FP2 + FP3 practice sessions to predict the Sunday Race.

Tests 5 Experimental Configurations (Assumption Ablation):
  1. Baseline Physical Model (No extra assumptions)
  2. + Assumption 1: Haas Aerodynamic Downforce Deficit (extra slip angle)
  3. + Assumption 2: High-Fuel Mass Scaling on Sliding Power (m^2 penalty)
  4. + Assumption 3: Driver Pace Management / Lift-and-Coast (PLI)
  5. Best Baked Model: All 3 assumptions combined
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from testDaksh.data_loader import HaasDataLoader
from testDaksh.haas_pipeline import HaasDegradationPipeline, PipelineConfig, StintPredictionResult

logging.basicConfig(level=logging.WARNING)


def run_circuit_experiment(
    circuit_name: str,
    total_race_laps: int,
    surface_abrasiveness: float,
    dl: HaasDataLoader,
) -> Dict[str, List[StintPredictionResult]]:
    """
    Runs full multi-session learning and race prediction across all 5 assumption configurations.
    """
    print("\n" + "=" * 80)
    print(f"EXPERIMENT: HAAS F1 (NICO HULKENBERG) - 2024 {circuit_name.upper()}")
    print(f"Training: FP1 + FP2 + FP3 -> Validating: Sunday Race (Driver: HUL #27)")
    print("=" * 80)

    # 1. Load Practice Sessions (FP1, FP2, FP3)
    practice_laps = []
    for fp in ["FP1", "FP2", "FP3"]:
        try:
            sess = dl.load_session(2024, circuit_name, fp)
            practice_laps.append(sess.laps_df)
        except Exception as e:
            print(f"Warning: Could not load {circuit_name} {fp}: {e}")

    if not practice_laps:
        print(f"Error: No practice laps loaded for {circuit_name}")
        return {}

    all_fp_laps = pd.concat(practice_laps, ignore_index=True)

    # 2. Load Sunday Race Session
    race_sess = dl.load_session(2024, circuit_name, "R")
    race_laps = race_sess.laps_df

    # 3. Define the 5 Ablation Configurations
    configs = {
        "1. Baseline (No Assumptions)": PipelineConfig(
            enable_aero_deficit=False,
            enable_fuel_mass_scaling=False,
            enable_driver_management=False,
        ),
        "2. + Assumption 1 (Haas Aero Deficit)": PipelineConfig(
            enable_aero_deficit=True,
            enable_fuel_mass_scaling=False,
            enable_driver_management=False,
        ),
        "3. + Assumption 2 (Fuel Mass Scaling)": PipelineConfig(
            enable_aero_deficit=False,
            enable_fuel_mass_scaling=True,
            enable_driver_management=False,
        ),
        "4. + Assumption 3 (Driver Management PLI)": PipelineConfig(
            enable_aero_deficit=False,
            enable_fuel_mass_scaling=False,
            enable_driver_management=True,
        ),
        "5. Best Baked (All Combined)": PipelineConfig(
            enable_aero_deficit=True,
            enable_fuel_mass_scaling=True,
            enable_driver_management=True,
        ),
    }

    results_by_config = {}

    for cfg_name, cfg in configs.items():
        pipeline = HaasDegradationPipeline(config=cfg)

        # Clean practice laps and decouple confounders
        clean_fp = pipeline.clean_laps(all_fp_laps, min_stint_len=3)
        decoupled_fp = pipeline.decouple_confounders(clean_fp, total_race_laps=total_race_laps, is_practice=True)
        practice_models = pipeline.calibrate_compound_models(decoupled_fp)

        # Clean race laps and decouple
        hul_race = race_laps[race_laps["driver"] == "HUL"].copy()
        clean_race = pipeline.clean_laps(hul_race, min_stint_len=4)
        decoupled_race = pipeline.decouple_confounders(clean_race, total_race_laps=total_race_laps, is_practice=False)

        stint_results = []
        for (drv, stint_no), st_group in decoupled_race.groupby(["driver", "stint"], sort=False):
            comp = str(st_group["compound"].iloc[0]).upper()
            prac_mod = practice_models.get(comp, {"base_pace_s": 80.0, "practice_alpha_s_per_lap": 0.08})
            res = pipeline.predict_and_evaluate_stint(
                race_stint_df=st_group,
                practice_model=prac_mod,
                circuit_abrasiveness=surface_abrasiveness,
                total_race_laps=total_race_laps,
            )
            if res:
                stint_results.append(res)

        results_by_config[cfg_name] = stint_results

    # Print Summary Table
    print("\n" + "-" * 115)
    print(f"{'Configuration':<38} | {'Stint':<5} | {'Comp':<6} | {'Laps':<4} | {'MAE (s)':<7} | {'R²':<7} | {'Obs Slope':<9} | {'Pred Slope':<10} | {'Slope Err'}")
    print("-" * 115)

    for cfg_name, s_results in results_by_config.items():
        for r in s_results:
            print(
                f"{cfg_name:<38} | {r.stint:<5} | {r.compound:<6} | {r.n_laps:<4} | "
                f"{r.mae_s:<7.3f} | {r.r_squared:<7.3f} | {r.observed_slope_s_per_lap:<9.4f} | "
                f"{r.predicted_slope_s_per_lap:<10.4f} | {r.slope_error_s_per_lap:<.4f}"
            )
        print("-" * 115)

    return results_by_config


def main():
    dl = HaasDataLoader()

    # Track 1: Spain (Barcelona)
    spain_results = run_circuit_experiment(
        circuit_name="Barcelona",
        total_race_laps=66,
        surface_abrasiveness=1.25,
        dl=dl,
    )

    # Track 2: Great Britain (Silverstone)
    silverstone_results = run_circuit_experiment(
        circuit_name="Silverstone",
        total_race_laps=52,
        surface_abrasiveness=1.30,
        dl=dl,
    )


if __name__ == "__main__":
    main()
