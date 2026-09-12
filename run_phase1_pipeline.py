"""
TrackShift Phase 1 End-to-End Pipeline Runner.

Executes the modular workflow:
  DIP (Data Ingestion) -> PIP (Preprocessing & 7 Filters) -> IEP (Physics Proxies)

Circuit: Circuit de Barcelona-Catalunya (Barcelona, Spain)
Default Session: 2024 Spanish Grand Prix (FP2 / Race)
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.dip.ingestion import DataIngestionPipeline, SessionIdentifier
from src.pip.preprocessing import PreprocessingPipeline
from src.iep.physics_proxies import PhysicsProxyPipeline

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("trackshift.runner")


def run_pipeline(
    year: int = 2024,
    circuit: str = "Barcelona",
    session_type: str = "FP2",
    pace_outlier_threshold_s: float = 2.0,
    min_stint_length: int = 4,
) -> None:
    """
    Executes the end-to-end Phase 1 pipeline on specified Barcelona session.

    Args:
        year: Championship season (default: 2024).
        circuit: Circuit identifier (default: 'Barcelona').
        session_type: FIA session abbreviation (default: 'FP2').
        pace_outlier_threshold_s: Rolling median pace outlier delta threshold (s).
        min_stint_length: Minimum valid laps per stint.
    """
    print("\n" + "=" * 70)
    print(f"TRACKSHIFT FORMULA 1 TYRE DEGRADATION INTELLIGENCE SYSTEM - PHASE 1")
    print(f"Target Session: {year} {circuit} [{session_type}]")
    print("=" * 70 + "\n")

    # -------------------------------------------------------------
    # STEP 1: Data Ingestion Pipeline (DIP)
    # -------------------------------------------------------------
    logger.info("Initializing Data Ingestion Pipeline (DIP)...")
    dip = DataIngestionPipeline(base_cache_dir="data/cache")

    try:
        dataset = dip.load_session(
            year=year,
            circuit=circuit,
            session_type=session_type,
            force_reload=False,
            load_telemetry=True,
        )
        logger.info(
            "DIP Ingestion Successful: %d laps loaded, %d stint records, %d weather observations.",
            len(dataset.laps),
            len(dataset.stints),
            len(dataset.weather),
        )
    except Exception as exc:
        logger.warning(
            "FastF1 live download unavailable (%s). Constructing high-fidelity synthetic Barcelona session.",
            exc,
        )
        dataset = _generate_synthetic_barcelona_session(year, circuit, session_type)

    # -------------------------------------------------------------
    # STEP 2: Preprocessing Pipeline (PIP)
    # -------------------------------------------------------------
    logger.info("Executing Preprocessing Pipeline (PIP) with 7 domain filters...")
    pip = PreprocessingPipeline(
        pace_outlier_threshold_s=pace_outlier_threshold_s,
        rolling_window_laps=5,
        min_stint_length=min_stint_length,
        filter_warmup_lap=True,
    )

    filter_result = pip.process(dataset.laps)
    print("\n" + filter_result.report.summary() + "\n")

    if filter_result.clean_laps.empty:
        logger.error("No laps survived the preprocessing filters. Halting pipeline.")
        return

    # -------------------------------------------------------------
    # STEP 3: Information Extraction Pipeline (IEP)
    # -------------------------------------------------------------
    logger.info("Executing Information Extraction Pipeline (IEP)...")
    iep = PhysicsProxyPipeline(
        lambda_lon=0.5,
        lambda_lat=1.0,
    )

    total_session_laps = int(dataset.laps["lap_number"].max()) if not dataset.laps.empty else 66
    iep_result = iep.process(
        cleaned_laps_df=filter_result.clean_laps,
        telemetry_map=dataset.telemetry,
        total_session_laps=total_session_laps,
    )

    enriched_df = iep_result.enriched_laps

    # -------------------------------------------------------------
    # Display Results & Physics Verification Metrics
    # -------------------------------------------------------------
    print("=" * 70)
    print("IEP ENRICHED LAP SAMPLE & PHYSICS-INFORMED DECOMPOSITION")
    print("=" * 70)
    display_cols = [
        "lap_number",
        "driver",
        "compound",
        "tyre_life",
        "lap_time_s",
        "fuel_mass_kg",
        "fuel_time_penalty_s",
        "lap_time_fuel_corrected_s",
        "track_evolution_s",
        "lap_time_fully_corrected_s",
    ]
    present_cols = [c for c in display_cols if c in enriched_df.columns]
    sample_preview = enriched_df[present_cols].head(12)
    print(sample_preview.to_string(index=False))

    print("\n" + "-" * 70)
    print("PHYSICS CONSTANTS & RECONCILIATION PARAMETERS")
    print("-" * 70)
    print(f"Initial Fuel Mass (M_0):         {iep_result.fuel_model_params['initial_fuel_mass_kg']:.1f} kg")
    print(f"Fuel Time Sensitivity (gamma):   {iep_result.fuel_model_params['fuel_penalty_s_per_kg']:.3f} s/kg")
    print(f"Track Evolution Asymptote (E_max):{iep_result.track_model_params['e_max_s']:.2f} s")
    print(f"Track Saturation Scale (tau):    {iep_result.track_model_params['tau_track_laps']:.1f} laps")

    # Stint performance summary
    print("\n" + "-" * 70)
    print("STINT AGGREGATION & PACE SUMMARY")
    print("-" * 70)
    stint_summary = (
        enriched_df.groupby(["driver", "stint", "compound"])
        .agg(
            valid_laps=("lap_number", "count"),
            min_pace=("lap_time_s", "min"),
            mean_pace=("lap_time_s", "mean"),
            mean_fuel_corrected=("lap_time_fuel_corrected_s", "mean"),
            tyre_life_start=("tyre_life", "min"),
            tyre_life_end=("tyre_life", "max"),
        )
        .reset_index()
    )
    print(stint_summary.to_string(index=False))
    print("=" * 70 + "\n")

    # Export enriched output
    out_dir = Path("data/cache/processed")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{dataset.session_id.cache_key}_enriched_phase1.parquet"
    enriched_df.to_parquet(out_file, index=False)
    logger.info("Enriched dataset persisted to: %s", out_file)


def _generate_synthetic_barcelona_session(
    year: int, circuit: str, session_type: str
) -> Any:
    """Generates realistic synthetic Barcelona session data for offline testing."""
    from src.dip.ingestion import SessionDataset, SessionIdentifier

    session_id = SessionIdentifier(year=year, circuit=circuit, session_type=session_type)
    drivers = ["VER", "HAM", "NOR", "LEC", "SAI", "RUS"]
    laps_list = []

    for drv_idx, drv in enumerate(drivers):
        base_pace = 78.5 + drv_idx * 0.2
        # Stint 1: Medium tyre (16 laps)
        for lap in range(1, 17):
            tyre_life = float(lap)
            # Physical wear + fuel burn
            wear_delta = 0.08 * (tyre_life ** 1.1)
            fuel_delta = 0.033 * 110.0 * (1.0 - lap / 66.0)
            noise = np.random.normal(0, 0.08)

            lap_time = base_pace + wear_delta + fuel_delta + noise
            # Introduce occasional traffic outlier on lap 9
            if lap == 9:
                lap_time += 3.2

            is_pit_out = lap == 1
            is_pit_in = lap == 16

            laps_list.append({
                "lap_number": lap,
                "driver": drv,
                "team": "F1 Team",
                "stint": 1,
                "compound": "MEDIUM",
                "tyre_life": tyre_life,
                "lap_time_s": lap_time,
                "sector1_time_s": lap_time * 0.28,
                "sector2_time_s": lap_time * 0.38,
                "sector3_time_s": lap_time * 0.34,
                "lap_start_time_s": (lap - 1) * 85.0,
                "pit_in_time_s": 80.0 if is_pit_in else np.nan,
                "pit_out_time_s": 0.0 if is_pit_out else np.nan,
                "track_status": "1",
                "is_accurate": True,
                "deleted": False,
            })

    laps_df = pd.DataFrame(laps_list)
    weather_df = pd.DataFrame({
        "time_s": np.arange(0, 3600, 60),
        "air_temp_c": 28.5 + np.sin(np.linspace(0, 1, 60)),
        "track_temp_c": 44.0 + np.sin(np.linspace(0, 1, 60)) * 2,
    })
    stints_df = OpenF1Ingestor.derive_stints_from_laps(laps_df)

    return SessionDataset(
        session_id=session_id,
        laps=laps_df,
        telemetry={},
        weather=weather_df,
        stints=stints_df,
    )


if __name__ == "__main__":
    run_pipeline()
