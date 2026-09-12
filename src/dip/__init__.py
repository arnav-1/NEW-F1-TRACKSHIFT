"""
Data Ingestion Pipeline (DIP) Module.

Provides connectors and normalizers for FastF1, OpenF1, and Open-Meteo,
with multi-tier caching (Parquet/JSON) for offline resilience.
"""

from src.dip.ingestion import (
    SessionIdentifier,
    DataIngestionPipeline,
    FastF1Ingestor,
    OpenF1Ingestor,
    OpenMeteoIngestor,
    SessionDataset,
)

__all__ = [
    "SessionIdentifier",
    "DataIngestionPipeline",
    "FastF1Ingestor",
    "OpenF1Ingestor",
    "OpenMeteoIngestor",
    "SessionDataset",
]
