import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import numpy as np
from core_model.code.thermal_wear_model import COMPOUND_PARAMS
from post_race_validation.code.post_race_validator import PostRaceValidator

def main():
    calib_path = Path("core_model/data/frozen_calibrations/frozen_practice_calibration_spain.json")
    with open(calib_path) as f:
        calib = json.load(f)

    v_base = PostRaceValidator()
    v_f1 = PostRaceValidator(enable_2024_blanket_deficit=True)
    v_f2 = PostRaceValidator(enable_2024_mass_distribution=True)
    v_f3 = PostRaceValidator(enable_2024_drs_lap2_wake=True)
    v_f4 = PostRaceValidator(enable_2024_tyre_scrub_state=True)
    v_all = PostRaceValidator(
        enable_2024_blanket_deficit=True,
        enable_2024_mass_distribution=True,
        enable_2024_drs_lap2_wake=True,
        enable_2024_tyre_scrub_state=True,
    )

    stint_len = 18
    args = (calib, "SOFT", stint_len, 42.0, 28.0, 95.0, 80.0)

    s_base = v_base.simulate_stint_from_practice(*args, stint_number=1, is_sticker_tyre=True)
    s_f1   = v_f1.simulate_stint_from_practice(*args, stint_number=1, is_sticker_tyre=True)
    s_f2   = v_f2.simulate_stint_from_practice(*args, stint_number=1, is_sticker_tyre=True)
    s_f3   = v_f3.simulate_stint_from_practice(*args, stint_number=1, is_sticker_tyre=True)
    s_f4   = v_f4.simulate_stint_from_practice(*args, stint_number=1, is_sticker_tyre=True)
    s_all  = v_all.simulate_stint_from_practice(*args, stint_number=1, is_sticker_tyre=True)

    print("=========================================================================================")
    print("LAP-BY-LAP REVEAL: BASELINE vs ALL 4 REGULATORY FEATURES COMBINED (BARCELONA SOFT STINT)")
    print("=========================================================================================")
    header = f"{'Lap':>3} | {'T_tread(B)':>10} {'T_tread(All)':>12} | {'Q_frict(B)':>10} {'Q_frict(All)':>12} | {'dot_wg(B)':>9} {'dot_wg(All)':>11} | {'mu_eff(B)':>9} {'mu_eff(All)':>11} | {'deg_s(B)':>8} {'deg_s(All)':>10}"
    print(header)
    print("-" * len(header))

    for lap in range(stint_len):
        tb = s_base["t_tread"][lap]
        ta = s_all["t_tread"][lap]
        qb = s_base["q_frict"][lap]
        qa = s_all["q_frict"][lap]
        wgb = s_base["dot_wg"][lap]
        wga = s_all["dot_wg"][lap]
        mub = s_base["effective_mu"][lap]
        mua = s_all["effective_mu"][lap]
        db = s_base["predicted_deg_s"][lap]
        da = s_all["predicted_deg_s"][lap]
        print(f"{lap:>3d} | {tb:10.2f}°C {ta:10.2f}°C | {qb:10.1f}W {qa:10.1f}W | {wgb:9.5f} {wga:11.5f} | {mub:9.4f} {mua:11.4f} | {db:8.3f}s {da:10.3f}s")

    print("\n--- POLYNOMIAL FITS & RATES ---")
    print(f"Baseline: beta_1_pred = {s_base['beta_1_pred']:.4f}, beta_1_per_lap = {s_base['beta_1_per_lap_pred']*1000:.2f} ms/lap, beta_2 = {s_base['beta_2_pred']:.4f}")
    print(f"Feature 1: beta_1_pred = {s_f1['beta_1_pred']:.4f}, beta_1_per_lap = {s_f1['beta_1_per_lap_pred']*1000:.2f} ms/lap, beta_2 = {s_f1['beta_2_pred']:.4f}")
    print(f"Feature 2: beta_1_pred = {s_f2['beta_1_pred']:.4f}, beta_1_per_lap = {s_f2['beta_1_per_lap_pred']*1000:.2f} ms/lap, beta_2 = {s_f2['beta_2_pred']:.4f}")
    print(f"Feature 3: beta_1_pred = {s_f3['beta_1_pred']:.4f}, beta_1_per_lap = {s_f3['beta_1_per_lap_pred']*1000:.2f} ms/lap, beta_2 = {s_f3['beta_2_pred']:.4f}")
    print(f"Feature 4: beta_1_pred = {s_f4['beta_1_pred']:.4f}, beta_1_per_lap = {s_f4['beta_1_per_lap_pred']*1000:.2f} ms/lap, beta_2 = {s_f4['beta_2_pred']:.4f}")
    print(f"All 4 Comb: beta_1_pred = {s_all['beta_1_pred']:.4f}, beta_1_per_lap = {s_all['beta_1_per_lap_pred']*1000:.2f} ms/lap, beta_2 = {s_all['beta_2_pred']:.4f}")

if __name__ == "__main__":
    main()
