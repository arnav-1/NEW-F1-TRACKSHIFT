"""
testDaksh: Mature Post-Race Validation System Batch Runner.

Executes the complete 10-pillar validation suite across the 2024 Formula 1 season:
- Spain, Silverstone, Austria, Bahrain, Hungary, Belgium (57 Sunday Race Stints)
- Full Failure Distribution Analysis across compounds, circuit types, and weather regimes
- Prediction Intervals (beta_1 +/- sigma) & Empirical Coverage Check
- Confidence Calibration & Reliability Bucketing
- Automated 8-Class Failure Taxonomy
- Sensitivity Gradients & Perturbation Robustness Matrix
- Operational Decision Validation & Attribution ("What would have changed the call?")
- 4-Tier Baseline Benchmark Comparison (Constant vs Linear vs Compound+Age vs Physical)
- Model Applicability Boundary Guard (ODD Status)

Saves results to: degradation_plots/mature_post_race_validation_results.json
"""

from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import json
import logging
import shutil
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from post_race_validation.code.stint_reconstructor import StintReconstructor
from post_race_validation.code.post_race_validator import PostRaceValidator
from post_race_validation.code.operational_validator import OperationalValidator

logger = logging.getLogger("post_race_validation.mature_runner")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] [MatureRunner] %(message)s")

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = WORKSPACE_ROOT / "post_race_validation" / "results"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR = Path(r"C:\Users\daksh\.gemini\antigravity-ide\brain\254a53b0-3ba4-4575-88bc-154466d2fe31")


def run_mature_validation_across_circuits(enable_2024_regulations: bool = True) -> Dict[str, Any]:
    """
    Executes the 10-pillar mature post-race validation pipeline across all target circuits.
    Incorporates 2024 FIA Sporting & Technical Regulatory physics by default.
    """
    circuits = [
        ("Spain", ["44", "63", "27"], "high_lateral", 42.0),
        ("Silverstone", ["44", "63", "27"], "high_speed", 24.0),
        ("Austria", ["1", "4", "63", "27"], "rear_traction", 46.0),
        ("Bahrain", ["1", "55", "44", "27"], "thermal_abrasive", 36.0),
        ("Hungary", ["44", "81", "27"], "tight_continuous", 48.0),
        ("Belgium", ["44", "63", "1", "27"], "elevation_cooling", 31.0),
    ]

    reconstructor = StintReconstructor()
    validator = PostRaceValidator(
        enable_2024_blanket_deficit=enable_2024_regulations,
        enable_2024_mass_distribution=enable_2024_regulations,
        enable_2024_drs_lap2_wake=enable_2024_regulations,
        enable_2024_tyre_scrub_state=enable_2024_regulations,
    )
    op_validator = OperationalValidator()

    all_circuit_records = []
    all_flat_stints = []

    for circuit_name, drivers, circuit_type, mean_track_t in circuits:
        logger.info("==================================================")
        logger.info("PROCESSING MATURE 10-PILLAR VALIDATION FOR %s", circuit_name.upper())
        logger.info("==================================================")

        # 1. Load Frozen Practice Calibration
        calib_file = WORKSPACE_ROOT / "core_model" / "data" / "frozen_calibrations" / f"frozen_practice_calibration_{circuit_name.lower()}.json"
        if not calib_file.exists():
            logger.warning("Frozen calibration for %s not found on disk at %s, skipping.", circuit_name, calib_file)
            continue

        with open(calib_file, "r") as f:
            frozen_calib = json.load(f)

        # 2. Reconstruct Sunday Race Stints (with in-stint normalized fuel burn)
        race_stints = reconstructor.reconstruct_race_stints(2024, circuit_name, target_drivers=drivers)
        if len(race_stints) == 0:
            logger.warning("No race stints found for %s.", circuit_name)
            continue

        circuit_stint_results = []
        comp_rates_pred = {}
        comp_rates_actual = {}

        for s in race_stints:
            comp = s["compound"].iloc[0]
            n_laps = len(s)
            base_p = s["base_pace"].iloc[0]
            track_t = s["track_temp_c"].iloc[0]
            air_t = s["air_temp_c"].iloc[0]
            fuel_init = s["fuel_mass_remaining"].iloc[0]
            stint_num = int(s["stint_number"].iloc[0])

            # Forward simulation from practice calibration (incorporating 2024 regulations)
            pred_stint = validator.simulate_stint_from_practice(
                frozen_calib, comp, n_laps, track_t, air_t, fuel_init, base_p,
                stint_number=stint_num,
                is_sticker_tyre=(stint_num == 1),
            )

            # Independent Sunday race inference
            race_inferred = validator.infer_race_stint_parameters(s)

            # Calculate temp drift from practice
            comp_info = frozen_calib["compounds"].get(comp, frozen_calib["compounds"]["MEDIUM"])
            practice_stints_cnt = comp_info.get("stints_analyzed", 5)
            temp_drift = abs(track_t - mean_track_t)

            # Master non-circular validation (Pillars 2, 3, 4, 10)
            val_metric = validator.validate_stint(pred_stint, race_inferred, practice_stints_cnt, temp_drift)

            # Baseline model comparison (Pillar 9)
            baselines = validator.compute_baseline_models(s, pred_stint)
            val_metric["baselines"] = baselines

            # Parameter sensitivity gradients (Pillar 5)
            sensitivities = validator.compute_sensitivity_gradients(
                frozen_calib, comp, n_laps, track_t, air_t, fuel_init, base_p
            )
            val_metric["sensitivities"] = sensitivities

            # Perturbation robustness (Pillar 6)
            robustness = validator.compute_perturbation_robustness(
                frozen_calib, comp, n_laps, track_t, air_t, fuel_init, base_p
            )
            val_metric["robustness"] = robustness

            # Operational Decision Validation (Pillar 7)
            d_pred = pred_stint["predicted_deg_s"]
            d_obs = race_inferred["observed_deg_s"]
            pit_decision = op_validator.evaluate_pit_window_decision(val_metric, d_pred, d_obs)
            val_metric["pit_decision"] = pit_decision

            # Decision Attribution ("What would have changed the call?") (Pillar 8)
            decision_attr = op_validator.decompose_decision_attribution(
                pit_decision["pit_window_error_laps"], temp_drift, val_metric["slope_error_lap_s"],
                val_metric["mae_phase1_scrubin_s"], n_laps
            )
            val_metric["decision_attribution"] = decision_attr

            # Track compound rates for ranking validation
            if comp not in comp_rates_pred:
                comp_rates_pred[comp] = val_metric["beta_1_lap_pred"]
                comp_rates_actual[comp] = val_metric["beta_1_lap_race"]

            circuit_stint_results.append(val_metric)

            # Flatten record for cross-circuit analysis
            flat_rec = dict(val_metric)
            flat_rec["circuit"] = circuit_name
            flat_rec["circuit_type"] = circuit_type
            flat_rec["track_temp_c"] = track_t
            flat_rec["mae_linear"] = baselines["mae_baseline1_linear"]
            flat_rec["mae_phys"] = baselines["mae_trackshift_physical"]
            flat_rec["impr_pct"] = baselines["physical_improvement_pct_vs_linear"]
            flat_rec["pit_err"] = pit_decision["pit_window_error_laps"]
            flat_rec["tax_primary"] = val_metric["failure_taxonomy"]["primary_failure_cause"]
            flat_rec["odd_stat"] = val_metric["odd_boundary"]["odd_status"]
            all_flat_stints.append(flat_rec)

        # Compound ranking validation for this circuit (Pillar 7)
        ranking_val = op_validator.evaluate_compound_selection_ranking(comp_rates_pred, comp_rates_actual)

        all_circuit_records.append({
            "circuit": circuit_name,
            "circuit_type": circuit_type,
            "stints_validated": len(circuit_stint_results),
            "compound_ranking_validation": ranking_val,
            "stints": circuit_stint_results,
        })

    # =========================================================================
    # CROSS-CIRCUIT AGGREGATIONS & FAILURE DISTRIBUTIONS (Pillar 1)
    # =========================================================================
    df_all = pd.DataFrame(all_flat_stints)

    # 1. Prediction Interval Empirical Coverage Rate
    coverage_rate = float(df_all["inside_prediction_interval"].mean() * 100.0)

    # 2. Confidence Calibration Reliability Curve
    conf_group = df_all.groupby("confidence_tier")
    conf_summary = {}
    for tier in ["HIGH", "MEDIUM", "LOW"]:
        if tier in conf_group.groups:
            sub = conf_group.get_group(tier)
            conf_summary[tier] = {
                "stint_count": len(sub),
                "mean_mae_s": float(sub["overall_mae_s"].mean()),
                "centered_shape_mae_s": float(sub["centered_shape_mae_s"].mean()),
                "mean_slope_error_lap_ms": float(sub["slope_error_lap_s"].mean() * 1000.0),
                "coverage_pct": float(sub["inside_prediction_interval"].mean() * 100.0),
            }

    # 3. Failure Distribution by Circuit Type
    circuit_type_group = df_all.groupby("circuit_type")
    type_summary = {}
    for c_type, sub in circuit_type_group:
        type_summary[c_type] = {
            "stints": len(sub),
            "mean_mae_s": float(sub["overall_mae_s"].mean()),
            "centered_shape_mae_s": float(sub["centered_shape_mae_s"].mean()),
            "slope_error_lap_ms": float(sub["slope_error_lap_s"].mean() * 1000.0),
            "pit_window_error_laps": float(sub["pit_err"].mean()),
        }

    # 4. Failure Distribution by Compound
    comp_group = df_all.groupby("compound")
    comp_summary = {}
    for comp, sub in comp_group:
        comp_summary[comp] = {
            "stints": len(sub),
            "mean_mae_s": float(sub["overall_mae_s"].mean()),
            "centered_shape_mae_s": float(sub["centered_shape_mae_s"].mean()),
            "slope_error_lap_ms": float(sub["slope_error_lap_s"].mean() * 1000.0),
            "pit_window_error_laps": float(sub["pit_err"].mean()),
        }

    # 5. Failure Taxonomy Frequency
    tax_counts = df_all["tax_primary"].value_counts().to_dict()

    # 6. Four-Tier Baseline Comparison Summary
    baseline_summary = {
        "mean_mae_baseline0_constant": float(df_all["baselines"].apply(lambda b: b["mae_baseline0_constant"]).mean()),
        "mean_mae_baseline1_linear": float(df_all["mae_linear"].mean()),
        "mean_mae_baseline2_compound_quad": float(df_all["baselines"].apply(lambda b: b["mae_baseline2_compound_quad"]).mean()),
        "mean_mae_trackshift_physical": float(df_all["mae_phys"].mean()),
        "mean_centered_shape_mae": float(df_all["centered_shape_mae_s"].mean()),
        "mean_physical_improvement_pct": float(df_all["impr_pct"].mean()),
    }

    # 7. Operational Decision Summary
    op_summary = {
        "mean_pit_window_error_laps": float(df_all["pit_err"].mean()),
        "pit_window_accuracy_pct": float((df_all["pit_err"] <= 2).mean() * 100.0),
        "total_stints_evaluated": len(df_all),
        "odd_valid_pct": float((df_all["odd_stat"] == "VALID").mean() * 100.0),
        "odd_degraded_pct": float((df_all["odd_stat"] == "DEGRADED").mean() * 100.0),
        "odd_invalid_pct": float((df_all["odd_stat"] == "INVALID").mean() * 100.0),
    }

    final_report = {
        "season": 2024,
        "circuits_benchmarked": [c[0] for c in circuits],
        "total_stints": len(df_all),
        "prediction_interval_coverage_pct": coverage_rate,
        "confidence_calibration": conf_summary,
        "failure_distribution_by_circuit_type": type_summary,
        "failure_distribution_by_compound": comp_summary,
        "failure_taxonomy_distribution": tax_counts,
        "baseline_models_comparison": baseline_summary,
        "operational_decision_summary": op_summary,
        "circuits_detail": all_circuit_records,
    }

    # Save to JSON
    save_path = OUTPUT_DIR / "mature_post_race_validation_results.json"
    with open(save_path, "w") as f:
        json.dump(final_report, f, indent=2)
    logger.info("Saved mature validation results to: %s", save_path)

    return final_report


if __name__ == "__main__":
    res = run_mature_validation_across_circuits()
    print("\n" + "=" * 90)
    print("MATURE POST-RACE VALIDATION EXECUTION SUMMARY (10 PILLARS)")
    print("=" * 90)
    print(f"Total Stints Validated         : {res['total_stints']}")
    print(f"Prediction Interval Coverage   : {res['prediction_interval_coverage_pct']:.1f}% (Target: >= 85%)")
    print(f"Mean Baseline Linear Age MAE   : {res['baseline_models_comparison']['mean_mae_baseline1_linear']:.3f} s")
    print(f"Mean TrackShift Physical MAE   : {res['baseline_models_comparison']['mean_mae_trackshift_physical']:.3f} s")
    print(f"Mean Centered Shape MAE        : {res['baseline_models_comparison']['mean_centered_shape_mae']:.3f} s")
    print(f"Physical Model Improvement     : {res['baseline_models_comparison']['mean_physical_improvement_pct']:.1f}% vs Linear Baseline")
    print(f"Pit Window Call Accuracy (<=2L): {res['operational_decision_summary']['pit_window_accuracy_pct']:.1f}%")
    print(f"Mean Pit Window Timing Error   : {res['operational_decision_summary']['mean_pit_window_error_laps']:.1f} laps")
    print("\nConfidence Calibration Ordering:")
    for t, c in res['confidence_calibration'].items():
        print(f"  [{t:<6} Tier] Stints={c['stint_count']:<2} | Centered MAE={c['centered_shape_mae_s']:.3f} s | Coverage={c['coverage_pct']:.1f}%")
    print("\nFailure Taxonomy Counts:")
    for k, v in res['failure_taxonomy_distribution'].items():
        print(f"  - {k:<45}: {v} stints")
    print("=" * 90)
