"""
Benchmark Experiment: 2024 FIA Sporting & Technical Regulatory Features.

Tests all 4 regulatory features across the 57 validated Sunday race stints:
1. Feature 1: h_blanket_exit_thermal_deficit (Tech Regs Art 10.8.4.d / Sporting Regs Art 44.4.b)
2. Feature 2: h_dynamic_mass_distribution (Tech Regs Art 4.1, 4.2 & 6.1.2)
3. Feature 3: h_drs_lap2_early_wake_sliding (2024 Sporting Regs Art 22.1.c.i)
4. Feature 4: h_tyre_scrub_state (Sporting Regs Art 30.2 & 30.4)
5. Combined: All 4 Features active together.

Compares against Baseline (legacy 100°C / uniform mass / clean air / pristine tyre).
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WORKSPACE_ROOT))

from core_model.code.thermal_wear_model import COMPOUND_PARAMS
from post_race_validation.code.stint_reconstructor import StintReconstructor
from post_race_validation.code.post_race_validator import PostRaceValidator
from post_race_validation.code.operational_validator import OperationalValidator

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger("regulatory_benchmark")


def run_experiment():
    circuits = [
        ("Spain", ["44", "63", "27"], "high_lateral", 42.0),
        ("Silverstone", ["44", "63", "27"], "high_speed", 24.0),
        ("Austria", ["1", "4", "63", "27"], "rear_traction", 46.0),
        ("Bahrain", ["1", "55", "44", "27"], "thermal_abrasive", 36.0),
        ("Hungary", ["44", "81", "27"], "tight_continuous", 48.0),
        ("Belgium", ["44", "63", "1", "27"], "elevation_cooling", 31.0),
    ]

    reconstructor = StintReconstructor()
    op_validator = OperationalValidator()

    # Pre-load all race stints and calibrations
    loaded_circuits = []
    total_stints_count = 0

    for circuit_name, drivers, circuit_type, mean_track_t in circuits:
        calib_file = WORKSPACE_ROOT / "core_model" / "data" / "frozen_calibrations" / f"frozen_practice_calibration_{circuit_name.lower()}.json"
        if not calib_file.exists():
            continue
        with open(calib_file, "r") as f:
            frozen_calib = json.load(f)

        race_stints = reconstructor.reconstruct_race_stints(2024, circuit_name, target_drivers=drivers)
        if not race_stints:
            continue

        loaded_circuits.append({
            "name": circuit_name,
            "drivers": drivers,
            "type": circuit_type,
            "mean_track_t": mean_track_t,
            "calib": frozen_calib,
            "stints": race_stints,
        })
        total_stints_count += len(race_stints)

    logger.info("Loaded %d circuits with %d total clean race stints.", len(loaded_circuits), total_stints_count)

    configurations = [
        ("Baseline (Legacy)", False, False, False, False),
        ("Feature 1 Only (Blanket Deficit)", True, False, False, False),
        ("Feature 2 Only (Dynamic Mass Dist)", False, True, False, False),
        ("Feature 3 Only (Lap 2 DRS Wake)", False, False, True, False),
        ("Feature 4 Only (Tyre Scrub State)", False, False, False, True),
        ("All 4 Combined (2024 Regulations)", True, True, True, True),
    ]

    benchmark_results = {}

    for config_name, f1, f2, f3, f4 in configurations:
        logger.info("--> Evaluating configuration: %s", config_name)
        validator = PostRaceValidator(
            enable_2024_blanket_deficit=f1,
            enable_2024_mass_distribution=f2,
            enable_2024_drs_lap2_wake=f3,
            enable_2024_tyre_scrub_state=f4,
        )

        stint_evals = []

        for c_data in loaded_circuits:
            c_name = c_data["name"]
            c_type = c_data["type"]
            c_calib = c_data["calib"]
            mean_track_t = c_data["mean_track_t"]

            for s in c_data["stints"]:
                comp = s["compound"].iloc[0]
                n_laps = len(s)
                base_p = s["base_pace"].iloc[0]
                track_t = s["track_temp_c"].iloc[0]
                air_t = s["air_temp_c"].iloc[0]
                fuel_init = s["fuel_mass_remaining"].iloc[0]
                stint_num = int(s["stint_number"].iloc[0])

                # Simulate from practice calibration
                pred_stint = validator.simulate_stint_from_practice(
                    c_calib, comp, n_laps, track_t, air_t, fuel_init, base_p,
                    enable_2024_blanket_deficit=f1,
                    enable_2024_mass_distribution=f2,
                    enable_2024_drs_lap2_wake=f3,
                    enable_2024_tyre_scrub_state=f4,
                    stint_number=stint_num,
                    is_sticker_tyre=(stint_num == 1),
                )

                race_inferred = validator.infer_race_stint_parameters(s)
                comp_info = c_calib["compounds"].get(comp, c_calib["compounds"]["MEDIUM"])
                practice_stints_cnt = comp_info.get("stints_analyzed", 5)
                temp_drift = abs(track_t - mean_track_t)

                val_metric = validator.validate_stint(pred_stint, race_inferred, practice_stints_cnt, temp_drift)
                baselines = validator.compute_baseline_models(s, pred_stint)
                val_metric["baselines"] = baselines

                d_pred = pred_stint["predicted_deg_s"]
                d_obs = race_inferred["observed_deg_s"]
                pit_decision = op_validator.evaluate_pit_window_decision(val_metric, d_pred, d_obs)
                val_metric["pit_decision"] = pit_decision

                flat = {
                    "circuit": c_name,
                    "circuit_type": c_type,
                    "compound": comp,
                    "stint_number": stint_num,
                    "stint_length": n_laps,
                    "overall_mae_s": val_metric["overall_mae_s"],
                    "centered_shape_mae_s": val_metric["centered_shape_mae_s"],
                    "mae_phase1_scrubin_s": val_metric["mae_phase1_scrubin_s"],
                    "mae_phase2_steady_s": val_metric["mae_phase2_steady_s"],
                    "mae_phase3_endstint_s": val_metric["mae_phase3_endstint_s"],
                    "slope_error_lap_s": val_metric["slope_error_lap_s"],
                    "inside_prediction_interval": val_metric["inside_prediction_interval"],
                    "mae_linear": baselines["mae_baseline1_linear"],
                    "mae_phys": baselines["mae_trackshift_physical"],
                    "impr_pct": baselines["physical_improvement_pct_vs_linear"],
                    "pit_err": pit_decision["pit_window_error_laps"],
                    "pit_accurate_2l": (pit_decision["pit_window_error_laps"] <= 2),
                    "primary_taxonomy": val_metric["failure_taxonomy"]["primary_failure_cause"],
                }
                stint_evals.append(flat)

        df = pd.DataFrame(stint_evals)

        summary = {
            "config_name": config_name,
            "total_stints": len(df),
            "mean_physical_mae_s": float(df["mae_phys"].mean()),
            "mean_centered_shape_mae_s": float(df["centered_shape_mae_s"].mean()),
            "mean_phase1_mae_s": float(df["mae_phase1_scrubin_s"].mean()),
            "mean_phase2_mae_s": float(df["mae_phase2_steady_s"].mean()),
            "mean_phase3_mae_s": float(df["mae_phase3_endstint_s"].mean()),
            "mean_slope_error_lap_ms": float(df["slope_error_lap_s"].mean() * 1000.0),
            "mean_linear_mae_s": float(df["mae_linear"].mean()),
            "physical_improvement_vs_linear_pct": float(df["impr_pct"].mean()),
            "prediction_interval_coverage_pct": float(df["inside_prediction_interval"].mean() * 100.0),
            "mean_pit_window_error_laps": float(df["pit_err"].mean()),
            "pit_window_accuracy_2l_pct": float(df["pit_accurate_2l"].mean() * 100.0),
            "taxonomy_counts": df["primary_taxonomy"].value_counts().to_dict(),
            "compound_breakdown": {},
            "circuit_type_breakdown": {},
        }

        for comp, cdf in df.groupby("compound"):
            summary["compound_breakdown"][comp] = {
                "stints": len(cdf),
                "physical_mae_s": float(cdf["mae_phys"].mean()),
                "centered_shape_mae_s": float(cdf["centered_shape_mae_s"].mean()),
                "phase1_mae_s": float(cdf["mae_phase1_scrubin_s"].mean()),
                "pit_err_laps": float(cdf["pit_err"].mean()),
            }

        for ctype, tdf in df.groupby("circuit_type"):
            summary["circuit_type_breakdown"][ctype] = {
                "stints": len(tdf),
                "physical_mae_s": float(tdf["mae_phys"].mean()),
                "centered_shape_mae_s": float(tdf["centered_shape_mae_s"].mean()),
                "pit_err_laps": float(tdf["pit_err"].mean()),
            }

        benchmark_results[config_name] = summary

    # Save results to json
    out_file = WORKSPACE_ROOT / "post_race_validation" / "results" / "benchmark_2024_regulatory_features.json"
    with open(out_file, "w") as f:
        json.dump(benchmark_results, f, indent=2)

    logger.info("Benchmark complete! Saved to %s", out_file)
    return benchmark_results


if __name__ == "__main__":
    run_experiment()
