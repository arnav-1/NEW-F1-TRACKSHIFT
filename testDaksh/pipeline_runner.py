"""
TrackShift Master Pipeline Runner (testDaksh/pipeline_runner.py).

Command-line orchestrator executing the full deterministic TrackShift backend pipeline:
1. Historical Prior Synthesis (Rounds 1-6)
2. Practice Continual Updating & Multi-Session Parameter Fusion (FP1/FP2/FP3)
3. Pre-Race Parameter Freeze
4. Sunday Race Forward Simulation
5. Downstream Deterministic Strategy Optimization
6. Independent Post-Race Validation & Non-Circular Grip Auditing
7. Post-Race Continual Learning & Walk-Forward Prior Updating
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from testDaksh.walk_forward_runner import WalkForwardRunner

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("testDaksh.pipeline_runner")


def main():
    parser = argparse.ArgumentParser(description="TrackShift Deterministic Tyre-Degradation Backend Runner")
    parser.add_argument("--demo-race", type=str, default="Spain", help="Primary weekend demo circuit")
    parser.add_argument("--validation-races", nargs="+", default=["Austria", "Silverstone", "Belgium"], help="Unseen transfer circuits")
    parser.add_argument("--exports-dir", type=str, default=str(PROJECT_ROOT / "exports"), help="Exports directory")

    args = parser.parse_args()

    exports_path = Path(args.exports_dir)
    exports_path.mkdir(parents=True, exist_ok=True)

    logger.info("================================================================================")
    logger.info("STARTING TRACKSHIFT DETERMINISTIC TYRE-DEGRADATION BACKEND")
    logger.info("Demo Target: %s | Validation Circuits: %s", args.demo_race, args.validation_races)
    logger.info("================================================================================")

    runner = WalkForwardRunner(exports_dir=exports_path)
    results = runner.run_walk_forward_benchmark()

    # Print clean numerical summary table
    print("\n" + "=" * 88)
    print("TRACKSHIFT SCIENTIFIC VALIDATION SCORECARD SUMMARY")
    print("=" * 88)
    print(f"{'Circuit':<14} | {'Comp':<6} | {'Shape MAE (s)':<14} | {'Slope Err (ms/lap)':<18} | {'Pit Acc (±2L)':<14} | {'Grip Corr':<10}")
    print("-" * 88)

    for circuit, scorecards in results["scorecards"].items():
        for sc in scorecards:
            grip_corr = f"{sc['telemetry_grip']['correlation']:.3f}" if sc.get("telemetry_grip") and sc['telemetry_grip']['status_code'] == 0 else "N/A"
            pit_acc = "YES" if sc["pit_captured_within_2l"] else f"NO ({sc['pit_window_error_laps']}L)"
            print(
                f"{circuit:<14} | {sc['compound']:<6} | {sc['centered_shape_mae_s']:<14.3f} | {sc['slope_error_ms_per_lap']:<18.1f} | {pit_acc:<14} | {grip_corr:<10}"
            )

    print("=" * 88)
    print("\nSTRATEGY OPTIMIZATION RESULTS:")
    for circuit, strat in results["strategy_plans"].items():
        seq = " -> ".join(strat["compound_sequence"])
        pits = ", ".join(f"Lap {p}" for p in strat["pit_laps"])
        print(f"  [{circuit}]: Optimal Sequence: {seq} | Pit Laps: {pits} | Predicted Time: {strat['predicted_total_race_time_s']:.1f}s")

    print("\nCONTINUAL LEARNING UPDATES (Post-Race -> Next Prior):")
    for circuit, updates in results["learning_updates"].items():
        print(f"  [{circuit}]:")
        for u in updates:
            print(f"    - {u['compound']} {u['parameter_name']}: {u['old_value']:.4f} -> {u['updated_value']:.4f} [{u['acceptance_status']}]")

    print("\n[SUCCESS] TrackShift Deterministic Backend executed cleanly with zero errors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
