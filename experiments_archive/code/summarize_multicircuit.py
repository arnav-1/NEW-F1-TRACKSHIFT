import json

data = json.load(open('degradation_plots/multicircuit_post_race_results.json', encoding='utf-8'))
print("\n" + "="*80)
print(f"{'CIRCUIT':<15} {'STINTS':<8} {'MEAN SLOPE ERR (ms/lap)':<25} {'MEDIAN MAE (s)':<18} {'FIDELITY':<10}")
print("="*80)
for c in data:
    print(f"{c['circuit']:<15} {c['race_stints_validated']:<8} {c['mean_slope_error_lap']*1000:<25.2f} {c['median_overall_mae']:<18.3f} {c['slope_fidelity_ratio']:<10.2f}")
print("="*80)
