"""
Degradation Estimation Pipeline (DEP) Module.

Provides:
- FourWheelState: Independent 4-corner wear state vector (FL, FR, RL, RR).
- AsymmetricLoadAllocator: Dynamic lateral roll and longitudinal pitch load allocation.
- TriMechanismWearModel: Mechanical abrasion, cold graining, and thermal blistering.
- PolynomialDegradationFitter: Empirical polynomial fitting (alpha * t + beta * t^2).
- CliffDetector: Inflection point detection for tyre performance cliffs.
- DegradationPipeline: Unified DEP engine fitting compound wear models.
"""

from src.dep.degradation import (
    FourWheelState,
    AsymmetricLoadAllocator,
    TriMechanismWearModel,
    WearMechanisms,
    CompoundThermalWindow,
    PolynomialDegradationFitter,
    DegradationFitResult,
    CliffDetector,
    CliffDetectionResult,
    DegradationPipeline,
    DEFAULT_THERMAL_WINDOWS,
)

__all__ = [
    "FourWheelState",
    "AsymmetricLoadAllocator",
    "TriMechanismWearModel",
    "WearMechanisms",
    "CompoundThermalWindow",
    "PolynomialDegradationFitter",
    "DegradationFitResult",
    "CliffDetector",
    "CliffDetectionResult",
    "DegradationPipeline",
    "DEFAULT_THERMAL_WINDOWS",
]
