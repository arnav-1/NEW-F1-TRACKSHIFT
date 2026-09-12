import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from testDaksh.stint_reconstructor import StintReconstructor
from testDaksh.post_race_validator import PostRaceValidator
from testDaksh.practice_degradation_inferer import PracticeDegradationInferer

inferer = PracticeDegradationInferer()
frozen = inferer.calibrate_and_freeze_physical_model(
    inferer.infer_compound_degradation_parameters(
        inferer.extract_clean_practice_stints(inferer.load_practice_session(2024, "Spain", "FP2"))
    ), "Spain"
)
reconstructor = StintReconstructor()
stints = reconstructor.reconstruct_race_stints(2024, "Spain", target_drivers=["44"])
validator = PostRaceValidator()

# Check Hamilton Stint 3
s = stints[2] # Stint 3
comp = s["compound"].iloc[0]
n_laps = len(s)
base_p = s["base_pace"].iloc[0]
pred_stint = validator.simulate_stint_from_practice(
    frozen, comp, n_laps, s["track_temp_c"].iloc[0], s["air_temp_c"].iloc[0], s["fuel_mass_remaining"].iloc[0], base_p
)
race_inferred = validator.infer_race_stint_parameters(s)

print("Hamilton Spain Stint 3:")
print("Observed Laps LapNumbers:", s["LapNumber"].values[:6])
print("Base pace:", base_p)
print("Lap times:", s["lap_time_s"].values[:6])
print("Fuel burned total:", 105.0 - s["fuel_mass_remaining"].values[:6])
print("Fuel correction (s):", s["fuel_correction_s"].values[:6])
print("d_obs[:6]:", race_inferred["observed_deg_s"][:6])
print("d_pred[:6]:", pred_stint["predicted_deg_s"][:6])
print("Residual d_obs - d_pred:", (race_inferred["observed_deg_s"] - pred_stint["predicted_deg_s"])[:6])
