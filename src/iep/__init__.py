"""
Information Extraction Pipeline (IEP) Module.

Provides physics-informed proxy derivations:
- Instantaneous fuel mass decay & lap-time correction
- Track evolution exponential saturation model
- Cartesian curvature and lateral tyre stress energy
- Braking thermal stress & longitudinal energy dissipation
- Contact patch lateral sliding velocity & sliding power (TRT formulation)
- Aerodynamic wake & dirty air thermal/sliding multiplier
- Micro-sector corner-by-corner segmentation (Turns 1-14)
"""

from src.iep.physics_proxies import (
    FuelDecayModel,
    TrackEvolutionModel,
    CurvatureEnergyExtractor,
    BrakingStressExtractor,
    SlipVelocityExtractor,
    WakePenaltyModel,
    TurnDefinition,
    TurnEnergyProfile,
    MicroSectorSegmenter,
    BARCELONA_TURNS,
    PhysicsProxyPipeline,
    PhysicsExtractionResult,
)

__all__ = [
    "FuelDecayModel",
    "TrackEvolutionModel",
    "CurvatureEnergyExtractor",
    "BrakingStressExtractor",
    "SlipVelocityExtractor",
    "WakePenaltyModel",
    "TurnDefinition",
    "TurnEnergyProfile",
    "MicroSectorSegmenter",
    "BARCELONA_TURNS",
    "PhysicsProxyPipeline",
    "PhysicsExtractionResult",
]
