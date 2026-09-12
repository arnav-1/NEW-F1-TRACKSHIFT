import json

d = json.load(open('degradation_plots/multicircuit_post_race_results.json'))
for c in d:
    print(f"\n=== CIRCUIT: {c['circuit']} ===")
    for s in c['stints'][:4]:
        print(f"  Drv {s['driver']} Stint {s['stint_number']} ({s['compound']:<6}) N={s['stint_length']:<2}: MAE={s['mae_overall']:.3f} s (P1={s['mae_phase1']:.3f}, P2={s['mae_phase2']:.3f}, P3={s['mae_phase3']:.3f}) | SlopeErr={s['slope_error_lap']*1000:.1f} ms/lap")
