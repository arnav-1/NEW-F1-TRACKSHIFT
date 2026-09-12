import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from testDaksh.data_loader import HaasDataLoader

def fetch_all():
    dl = HaasDataLoader()
    targets = [
        (2024, "Barcelona", "FP1"),
        (2024, "Barcelona", "FP2"),
        (2024, "Barcelona", "FP3"),
        (2024, "Barcelona", "R"),
        (2024, "Silverstone", "FP1"),
        (2024, "Silverstone", "FP2"),
        (2024, "Silverstone", "FP3"),
        (2024, "Silverstone", "R"),
    ]
    for year, circuit, sess in targets:
        print(f"\n--- Loading {year} {circuit} {sess} ---")
        try:
            s = dl.load_session(year, circuit, sess)
            print(f"Successfully cached {year} {circuit} {sess}: {len(s.laps_df)} Haas laps.")
        except Exception as e:
            print(f"Failed {year} {circuit} {sess}: {e}")

if __name__ == "__main__":
    fetch_all()
