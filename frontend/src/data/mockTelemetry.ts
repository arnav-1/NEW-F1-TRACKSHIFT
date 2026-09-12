import type {
  LapTelemetryRecord,
  StintBenchmark,
  CircuitId,
  SessionId,
  TyreCompound,
  TyreCornerMetrics,
} from '../types/telemetry';

export const STINT_BENCHMARKS: StintBenchmark[] = [
  {
    circuit: 'Barcelona (Stint 1)',
    compound: 'SOFT',
    laps_completed: 10,
    poly_baseline_mae: 0.842,
    trackshift_physical_mae: 0.182,
    slope_error: 0.012,
    r_squared: 0.865,
    cliff_lap_predicted: 9.8,
    cliff_lap_actual: 10.0,
    status: 'PASSED',
  },
  {
    circuit: 'Barcelona (Stint 2)',
    compound: 'HARD',
    laps_completed: 27,
    poly_baseline_mae: 1.534,
    trackshift_physical_mae: 0.618,
    slope_error: 0.048,
    r_squared: 0.082,
    cliff_lap_predicted: 25.0,
    cliff_lap_actual: 24.5,
    status: 'PASSED',
  },
  {
    circuit: 'Silverstone (Stint 1)',
    compound: 'SOFT',
    laps_completed: 12,
    poly_baseline_mae: 1.280,
    trackshift_physical_mae: 0.346,
    slope_error: 0.015,
    r_squared: 0.812,
    cliff_lap_predicted: 11.5,
    cliff_lap_actual: 12.0,
    status: 'PASSED',
  },
];

export function generateLapTelemetry(
  circuit: CircuitId,
  session: SessionId,
  compound: TyreCompound = 'SOFT',
  aeroDeficit: number = 0.88,
  massScaling: boolean = true,
  pushLevel: number = 0.94
): LapTelemetryRecord[] {
  const isBarcelona = circuit === 'barcelona';
  const basePace = isBarcelona ? 80.2 : 90.5;

  // Stint length depending on compound and session
  let totalLaps = 18;
  if (session === 'Race') {
    if (compound === 'SOFT') totalLaps = 12;
    else if (compound === 'MEDIUM') totalLaps = 20;
    else totalLaps = 27;
  } else {
    totalLaps = compound === 'HARD' ? 22 : 14;
  }

  const points: LapTelemetryRecord[] = [];
  const startFuel = session === 'Race' ? 102.5 : 36.0;
  const burnRate = 1.60;

  // Extra thermal penalty from aero deficit (default 0.88 downforce -> +4.8°C extra heat)
  const aeroHeatDelta = (1.0 - aeroDeficit) * 40.0; // ~4.8°C

  // Thermal baseline and wear sensitivity per compound
  const compoundWearFactor = compound === 'SOFT' ? 1.45 : compound === 'MEDIUM' ? 1.0 : 0.65;
  const compoundTempOffset = compound === 'SOFT' ? 4.0 : compound === 'MEDIUM' ? 0.0 : -6.0;
  const cliffLapNominal = compound === 'SOFT' ? 9.8 : compound === 'MEDIUM' ? 17.5 : 24.5;

  for (let lap = 1; lap <= totalLaps; lap++) {
    const fuelRemaining = Math.max(4.0, startFuel - (lap - 1) * burnRate);
    const fuelPenalty = 0.033 * fuelRemaining;
    const sessionLapOffset = session === 'Race' ? lap + 38 : lap;
    const trackEvo = 1.25 * (1.0 - Math.exp(-sessionLapOffset / 120.0));

    const massFactor = massScaling ? Math.pow(fuelRemaining / 35.0, 0.4) : 1.0;
    const tyreAge = lap;

    // Physical damage rates
    const abrasion = 0.00014 * Math.pow(tyreAge / 10.0, 1.15) * compoundWearFactor * massFactor * pushLevel;
    const graining = (tyreAge <= 2 && compound === 'SOFT') ? 0.00010 : 0.0;
    const isPastCliff = tyreAge >= Math.floor(cliffLapNominal);
    const blistering = isPastCliff
      ? 0.00028 * Math.pow(Math.max(0, tyreAge - cliffLapNominal + 1) / 3.0, 1.75) * compoundWearFactor
      : 0.0;

    const totalWearRate = abrasion + graining + blistering;
    const cumulativeDamage = Math.min(1.0, 0.03 + totalWearRate * tyreAge * 14.0);

    // Pace delta from wear
    const linearDeg = compound === 'SOFT' ? 0.075 : compound === 'MEDIUM' ? 0.052 : 0.035;
    const quadraticDeg = isPastCliff
      ? 0.022 * Math.pow(tyreAge - cliffLapNominal, 2)
      : 0.0015 * Math.pow(tyreAge, 1.8);
    const wearPaceLoss = (linearDeg * tyreAge + quadraticDeg) * (1.0 + (1.0 - pushLevel) * 0.15);

    const paceCorrected = basePace + wearPaceLoss;

    // Deterministic timing noise and domain filter outliers
    let noise = ((lap * 41) % 19 - 9) * 0.022;
    let isOutlier = false;
    let outlierReason: string | null = null;

    if (lap === 5 && session === 'Race') {
      noise += 2.85;
      isOutlier = true;
      outlierReason = 'Traffic Spike (+2.85s behind Bottas)';
    } else if (lap === 10 && session === 'Race' && totalLaps >= 14) {
      noise += 3.20;
      isOutlier = true;
      outlierReason = 'Yellow Flag Slowdown (+3.20s Sector 2)';
    }

    const rawLapTime = paceCorrected + fuelPenalty - trackEvo + noise;
    const predictedPace = basePace + linearDeg * tyreAge + (isPastCliff ? 0.019 * Math.pow(tyreAge - cliffLapNominal, 2) : 0.0018 * Math.pow(tyreAge, 1.8));

    // Corner thermals
    const flTread = 98.0 + compoundTempOffset + (tyreAge * 0.85) + aeroHeatDelta * 0.4 + (isPastCliff ? 7.5 : 0);
    const flCarcass = 91.0 + compoundTempOffset + (tyreAge * 0.65) + aeroHeatDelta * 0.2 + (isPastCliff ? 5.5 : 0);

    const getCornerStatus = (tread: number): 'OPTIMAL' | 'GRAINING_RISK' | 'OVERHEATING' => {
      if (tread < 85 && compound === 'SOFT') return 'GRAINING_RISK';
      if (tread > 118) return 'OVERHEATING';
      return 'OPTIMAL';
    };

    const makeCorner = (
      corner: 'FL' | 'FR' | 'RL' | 'RR',
      share: number,
      treadDelta: number,
      carcDelta: number,
      abrasionScale: number,
      blisterScale: number,
      isLimiting: boolean
    ): TyreCornerMetrics => {
      const tread = flTread + treadDelta;
      const carc = flCarcass + carcDelta;
      return {
        corner,
        workload_share: share,
        tread_temp_c: Number(tread.toFixed(1)),
        carcass_temp_c: Number(carc.toFixed(1)),
        abrasion_rate: Number((abrasion * abrasionScale).toFixed(5)),
        graining_rate: Number((graining * (isLimiting ? 1.0 : 0.3)).toFixed(5)),
        blistering_rate: Number((blistering * blisterScale).toFixed(5)),
        cumulative_damage: Number((cumulativeDamage * (isLimiting ? 1.0 : share / 0.362)).toFixed(3)),
        is_limiting: isLimiting,
        status: getCornerStatus(tread),
      };
    };

    const corners: Record<'FL' | 'FR' | 'RL' | 'RR', TyreCornerMetrics> = {
      FL: makeCorner('FL', 0.362, 0.0, 0.0, 0.40, 0.55, true),
      FR: makeCorner('FR', 0.181, -13.8, -11.5, 0.18, 0.15, false),
      RL: makeCorner('RL', 0.276, -5.6, -3.2, 0.28, 0.20, false),
      RR: makeCorner('RR', 0.181, -15.9, -13.1, 0.14, 0.10, false),
    };

    points.push({
      lap_number: lap,
      tyre_life: lap,
      raw_lap_time: Number(rawLapTime.toFixed(3)),
      fuel_remaining_kg: Number(fuelRemaining.toFixed(1)),
      fuel_penalty_s: Number(fuelPenalty.toFixed(3)),
      track_evolution_s: Number(trackEvo.toFixed(3)),
      pace_corrected_s: Number(paceCorrected.toFixed(3)),
      predicted_pace_s: Number(predictedPace.toFixed(3)),
      is_outlier: isOutlier,
      outlier_reason: outlierReason,
      corners,
    });
  }

  return points;
}
