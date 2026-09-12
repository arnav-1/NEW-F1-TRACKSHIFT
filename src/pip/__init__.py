"""
Preprocessing Pipeline (PIP) Module.

Provides the 7-stage motorsport cleaning filters, stint segmentation,
and pace outlier rejection for lap time series.
"""

from src.pip.preprocessing import (
    LapFilterResult,
    FilteringReport,
    PreprocessingPipeline,
)

__all__ = [
    "LapFilterResult",
    "FilteringReport",
    "PreprocessingPipeline",
]
