"""
Comparison & Management Platform (CMP) Module.

Provides:
- CircuitProfile: Track metadata and physical archetype parameterization.
- CIRCUIT_PROFILES: Canonical profiles for Barcelona, Silverstone, Monza, Spa, Monaco.
- ValidationMetrics: MAE, R², slope error, cliff accuracy metrics and acceptance tests.
- StintValidator: Validates practice models against held-out Sunday race stints.
- ComparisonPlatform: Outer shell orchestrating comparative analytics across sessions.
"""

from src.cmp.comparison import (
    CircuitProfile,
    CIRCUIT_PROFILES,
    ValidationMetrics,
    StintComparisonReport,
    StintValidator,
    ComparisonPlatform,
)

__all__ = [
    "CircuitProfile",
    "CIRCUIT_PROFILES",
    "ValidationMetrics",
    "StintComparisonReport",
    "StintValidator",
    "ComparisonPlatform",
]
