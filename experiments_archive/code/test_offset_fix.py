import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from testDaksh.stint_reconstructor import StintReconstructor
from testDaksh.post_race_validator import PostRaceValidator
from testDaksh.practice_degradation_inferer import PracticeDegradationInferer
import fastf1
import numpy as np

fastf1.Cache.enable_cache(r"C:\Users\daksh\AppData\Local\Temp\fastf1")

inferer = PracticeDegradationInferer()
frozen = inferer.calibrate_and_freeze_physical_model(
    inferer.infer_compound_degradation_parameters(
        inferer.extract_clean_practice_stints(inferer.load_practice_session(2024, "Spain", "FP2"))
    ), "Spain"
)
reconstructor = StintReconstructor()
stints = reconstructor.reconstruct_race_stints(2024, "Spain", target_drivers=["44"])
validator = PostRaceValidator()

for i, s in enumerate(stints):
    comp = s["compound"].iloc[0]
    n_laps = len(s)
    base_p = s["base_pace"].iloc[0]
    pred_stint = validator.simulate_stint_from_practice(
        frozen, comp, n_laps, s["track_temp_c"].iloc[0], s["air_temp_c"].iloc[0], s["fuel_mass_remaining"].iloc[0], base_p
    )
    race_inferred = validator.infer_race_stint_parameters(s)
    
    # Raw MAE
    d_obs = race_inferred["observed_deg_s"]
    d_pred_raw = pred_stint["predicted_deg_s"]
    raw_mae = np.mean(np.abs(d_obs - d_pred_raw))
    
    # Baseline-aligned MAE (both starting at 0 degradation)
    d_pred_aligned = d_pred_raw - d_pred_raw[0]
    aligned_mae = np.mean(np.abs(d_obs - d_pred_aligned))
    
    # Centered MAE (shape MAE)
    shape_mae = np.mean(np.abs((d_obs - np.mean(d_obs)) - (d_pred_raw - np.mean(d_pred_raw))))
    
    print(f"Stint {i+1} ({comp}, N={n_laps}):")
    print(f"  Raw MAE             : {raw_mae:.3f} s")
    print(f"  Baseline-Aligned MAE: {aligned_mae:.3f} s")
    print(f"  Centered Shape MAE  : {shape_mae:.3f} s")
    print(f"  Slope Error (ms/lap): {abs(pred_stint['beta_1_per_lap_pred'] - race_inferred['beta_1_per_lap_race'])*1000:.1f} ms/lap")
