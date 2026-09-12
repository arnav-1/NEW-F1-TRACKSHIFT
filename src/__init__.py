"""
TrackShift: Deterministic, Physics-Informed Formula 1 Tyre Degradation Intelligence System.

Modules:
- dip: Data Ingestion Pipeline (FastF1, OpenF1, Open-Meteo, disk caching, schema normalization)
- pip: Preprocessing Pipeline (7-stage lap filtering, stint segmentation, outlier rejection)
- iep: Information Extraction Pipeline (physics proxies, fuel decay, track evolution, frictional/thermal workload)
"""

__version__ = "0.1.0"
