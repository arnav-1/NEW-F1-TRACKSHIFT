"""
testDaksh: Export All High-Resolution, Large-Scale Stint Plots to a Dedicated Folder.

Saves individual large-scale figures for each stint to:
- c:/Users/daksh/Projects/Trackshiftv2/degradation_plots/
- And mirrors them to the artifacts directory.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import shutil
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from testDaksh.data_loader import HaasDataLoader
from testDaksh.haas_pipeline import HaasDegradationPipeline, PipelineConfig

OUTPUT_DIR = Path(r"c:\Users\daksh\Projects\Trackshiftv2\degradation_plots")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ARTIFACTS_DIR = Path(r"C:\Users\daksh\.gemini\antigravity-ide\brain\254a53b0-3ba4-4575-88bc-154466d2fe31")

plt.style.use("dark_background")
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["Segoe UI", "DejaVu Sans", "Arial"]
plt.rcParams["axes.edgecolor"] = "#30363d"
plt.rcParams["grid.color"] = "#21262d"
plt.rcParams["grid.linestyle"] = "--"

compound_colors = {
    "SOFT": "#ff3333",
    "MEDIUM": "#ffd700",
    "HARD": "#ffffff",
    "INTERMEDIATE": "#39d353",
}

dl = HaasDataLoader()
cfg_best = PipelineConfig(
    enable_aero_deficit=True,
    enable_fuel_mass_scaling=True,
    enable_driver_management=True,
)
pipeline = HaasDegradationPipeline(config=cfg_best)


def plot_single_stint(
    circuit_name: str,
    stint_title: str,
    compound: str,
    res,
    filename: str,
):
    """Plots an individual, full-scale, zoomed-in stint plot with clear Y-axis and large typography."""
    fig, ax = plt.subplots(figsize=(12, 7.5))
    fig.patch.set_facecolor("#0d1117")
    ax.set_facecolor("#161b22")
    ax.grid(True, alpha=0.3)

    comp_color = compound_colors.get(compound.upper(), "#00e5ff")
    t_obs = res.laps_observed
    y_obs = res.pace_observed
    y_pred = res.pace_predicted

    # Scatter of observed decoupled points
    ax.scatter(
        t_obs, y_obs,
        color=comp_color, s=70, alpha=0.9, edgecolors="#ffffff", linewidth=1.0,
        label="Observed Lap Pace (Decoupled Fuel Weight & Track Rubbering)", zorder=4
    )

    # TrackShift physical prediction line
    ax.plot(
        t_obs, y_pred,
        color="#00e5ff", linewidth=3.5, linestyle="-",
        label=f"TrackShift Physical Prediction (MAE: {res.mae_s:.3f}s)", zorder=5
    )

    # Linear observed trend
    z = np.polyfit(t_obs, y_obs, 1)
    p = np.poly1d(z)
    ax.plot(
        t_obs, p(t_obs),
        color=comp_color, linewidth=1.8, linestyle=":", alpha=0.7,
        label=f"Observed Linear Trend ({res.observed_slope_s_per_lap:+.3f} s/lap)", zorder=3
    )

    # Title & Labels
    ax.set_title(
        f"{circuit_name.upper()} - {stint_title}\n"
        f"Haas F1 Team (#27 Nico Hülkenberg) | Forward State-Space Degradation Model",
        fontsize=15, fontweight="bold", color="#58a6ff", pad=15
    )
    ax.set_xlabel("Tyre Age (Laps Completed on this Tyre Set)", fontsize=13, color="#c9d1d9", labelpad=10)
    ax.set_ylabel("Fuel- & Track-Decoupled Lap Time (Seconds)", fontsize=13, color="#c9d1d9", labelpad=10)

    # Clear zoomed Y limits
    y_min = min(y_obs.min(), y_pred.min()) - 0.35
    y_max = max(y_obs.max(), y_pred.max()) + 0.35
    ax.set_ylim(y_min, y_max)
    ax.tick_params(axis="both", labelsize=11, colors="#8b949e")

    # Legend
    ax.legend(loc="upper left", fontsize=11, framealpha=0.7, facecolor="#0d1117")

    # Detailed metrics card
    stats = (
        f"Compound: {compound}\n"
        f"Stint Distance: {res.n_laps} Laps\n"
        f"Mean Absolute Error (MAE): {res.mae_s:.3f} s\n"
        f"Observed Degradation Slope: {res.observed_slope_s_per_lap:+.4f} s/lap\n"
        f"Predicted Degradation Slope: {res.predicted_slope_s_per_lap:+.4f} s/lap\n"
        f"Slope Error: {res.slope_error_s_per_lap:.4f} s/lap\n"
        f"Mean Tread Temp: {res.mean_predicted_tread_temp_c:.1f} °C\n"
        f"Final Accumulated Damage D: {res.final_accumulated_damage_d:.3f}"
    )
    ax.text(
        0.97, 0.05, stats,
        transform=ax.transAxes,
        fontsize=10.5, color="#f0f6fc",
        va="bottom", ha="right",
        bbox=dict(boxstyle="round,pad=0.7", facecolor="#0d1117", edgecolor="#30363d", alpha=0.92)
    )

    plt.tight_layout()
    out_file = OUTPUT_DIR / filename
    fig.savefig(out_file, dpi=200, bbox_inches="tight")
    
    # Mirror to artifacts
    shutil.copy(out_file, ARTIFACTS_DIR / filename)
    plt.close(fig)
    print(f"Saved: {out_file}")


# ==============================================================================
# 1. PROCESS BARCELONA
# ==============================================================================
fp_spain = []
for fp in ["FP1", "FP2", "FP3"]:
    fp_spain.append(dl.load_session(2024, "Spain", fp).laps_df)
clean_fp_spain = pipeline.clean_laps(pd.concat(fp_spain, ignore_index=True))
decoupled_fp_spain = pipeline.decouple_confounders(clean_fp_spain, 66, True)
spain_models = pipeline.calibrate_compound_models(decoupled_fp_spain)

race_spain = dl.load_session(2024, "Spain", "R").laps_df
clean_race_spain = pipeline.clean_laps(race_spain)
decoupled_race_spain = pipeline.decouple_confounders(clean_race_spain, 66, False)
hul_spain = decoupled_race_spain[decoupled_race_spain["driver"] == "HUL"]

stint_names_spain = {
    1: ("Stint 1: SOFT Compound (Laps 1 to 10)", "barcelona_stint1_soft_zoomed.png"),
    2: ("Stint 2: MEDIUM Compound (Laps 11 to 29)", "barcelona_stint2_medium_zoomed.png"),
    3: ("Stint 3: HARD Compound (Laps 30 to 56)", "barcelona_stint3_hard_zoomed.png"),
}

for stint_no, st_df in hul_spain.groupby("stint"):
    if stint_no in stint_names_spain and len(st_df) >= 4:
        comp = str(st_df["compound"].iloc[0]).upper()
        title, fname = stint_names_spain[stint_no]
        res = pipeline.predict_and_evaluate_stint(st_df, spain_models.get(comp, {}), circuit_abrasiveness=1.25, total_race_laps=66)
        if res:
            plot_single_stint("Spanish GP (Barcelona)", title, comp, res, fname)


# ==============================================================================
# 2. PROCESS SILVERSTONE
# ==============================================================================
fp_silver = []
for fp in ["FP1", "FP2", "FP3"]:
    fp_silver.append(dl.load_session(2024, "Silverstone", fp).laps_df)
clean_fp_silver = pipeline.clean_laps(pd.concat(fp_silver, ignore_index=True))
decoupled_fp_silver = pipeline.decouple_confounders(clean_fp_silver, 52, True)
silver_models = pipeline.calibrate_compound_models(decoupled_fp_silver)

race_silver = dl.load_session(2024, "Silverstone", "R").laps_df
clean_race_silver = pipeline.clean_laps(race_silver)
decoupled_race_silver = pipeline.decouple_confounders(clean_race_silver, 52, False)
hul_silver = decoupled_race_silver[decoupled_race_silver["driver"] == "HUL"]

# Process Dry Medium Stint 1 (Laps 1-16) and Dry Soft Stint 3 (Laps 40-52)
for stint_no, st_df in hul_silver.groupby("stint"):
    comp = str(st_df["compound"].iloc[0]).upper()
    if stint_no == 1 and len(st_df) >= 4:
        # Filter to dry phase before rain
        st_dry = st_df[st_df["lap_number"] <= 16].copy()
        res = pipeline.predict_and_evaluate_stint(st_dry, silver_models.get("MEDIUM", {}), circuit_abrasiveness=1.10, total_race_laps=52)
        if res:
            plot_single_stint("British GP (Silverstone)", "Stint 1: MEDIUM Compound (Dry Phase, Laps 1-16)", "MEDIUM", res, "silverstone_stint1_medium_zoomed.png")
    elif stint_no == 3 and len(st_df) >= 4:
        res = pipeline.predict_and_evaluate_stint(st_df, silver_models.get("SOFT", {}), circuit_abrasiveness=1.10, total_race_laps=52)
        if res:
            plot_single_stint("British GP (Silverstone)", "Stint 3: SOFT Compound (Final Sprint to P6, Laps 40-52)", "SOFT", res, "silverstone_stint3_soft_zoomed.png")

# Copy the full race timelines into degradation_plots folder
shutil.copy(ARTIFACTS_DIR / "barcelona_stints_degradation_curves.png", OUTPUT_DIR / "barcelona_all_stints_overview.png")
shutil.copy(ARTIFACTS_DIR / "race_strategy_pitstop_degradation_timeline.png", OUTPUT_DIR / "barcelona_race_strategy_timeline.png")
shutil.copy(ARTIFACTS_DIR / "silverstone_full_race_weather_degradation.png", OUTPUT_DIR / "silverstone_full_race_weather_timeline.png")
shutil.copy(ARTIFACTS_DIR / "cross_race_generalization_comparison.png", OUTPUT_DIR / "cross_race_benchmark_comparison.png")

print(f"\nAll high-resolution stint plots successfully exported to: {OUTPUT_DIR}")
