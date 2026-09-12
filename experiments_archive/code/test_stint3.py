import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import json

# Let's inspect the exact numbers for Stint 3 in Spain from multicircuit_post_race_results.json
d = json.load(open('degradation_plots/multicircuit_post_race_results.json'))
spain = d[0]
stint3 = spain['stints'][2] # Ham Stint 3 Soft
print("Driver 44 Stint 3 Spain:")
print(f"  Stint Length: {stint3['stint_length']}")
print(f"  Slope Error: {stint3['slope_error_lap']*1000:.2f} ms/lap")
print(f"  Current Overall MAE: {stint3['mae_overall']:.3f} s")
print(f"  Current Phase 1 MAE: {stint3['mae_phase1']:.3f} s")
print(f"  Current Phase 2 MAE: {stint3['mae_phase2']:.3f} s")
print(f"  Current Phase 3 MAE: {stint3['mae_phase3']:.3f} s")
