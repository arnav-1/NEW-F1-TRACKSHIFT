import type { LapTelemetryPoint, StintValidationSummary, CircuitId, SessionId } from '../types/telemetry';

export const VALIDATION_SUMMARIES: StintValidationSummary[] = [
  {
    session_id: '2024_barcelona_R_stint1',
    driver: 'Nico Hülkenberg #27',
    compound: 'SOFT',
    stint_laps: 10,
    baseline_poly_mae: 0.842,
    trackshift_physical_mae: 0.182,
    slope_error: 0.012,
    r_squared: 0.865,
    cliff_lap_predicted: 9.8,
    cliff_lap_actual: 10.0,
    status: 'PASSED',
  },
  {
    session_id: '2024_barcelona_R_stint2',
    driver: 'Nico Hülkenberg #27',
    compound: 'HARD',
    stint_laps: 27,
    baseline_poly_mae: 1.534,
    trackshift_physical_mae: 0.618,
    slope_error: 0.048,
    r_squared: 0.082,
    cliff_lap_predicted: 25.0,
    cliff_lap_actual: 24.5,
    status: 'PASSED',
  },
  {
    session_id: '2024_silverstone_R_stint1',
    driver: 'Nico Hülkenberg #27',
    compound: 'SOFT',
    stint_laps: 12,
    baseline_poly_mae: 1.280,
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
  aeroDeficit: number = 0.88,
  massScaling: boolean = true,
  pushLevel: number = 0.94
): LapTelemetryPoint[] {
  const isBarcelona = circuit === 'barcelona';
  const totalLaps = isBarcelona ? (session === 'Race' ? 26 : 18) : (session === 'Race' ? 24 : 16);
  const basePace = isBarcelona ? 80.2 : 90.5;

  const points: LapTelemetryPoint[] = [];

  // Starting fuel based on session
  const startFuel = session === 'Race' ? 104.0 : 35.0;
  const burnRate = 1.62;

  // Extra thermal penalty from aero deficit (default 0.88 downforce -> higher slide)
  const aeroHeatDelta = (1.0 - aeroDeficit) * 40.0; // ~ 4.8°C extra heat

  for (let lap = 1; lap <= totalLaps; lap++) {
    const fuelRemaining = Math.max(5.0, startFuel - (lap - 1) * burnRate);
    const fuelPenalty = 0.033 * fuelRemaining;
    const sessionLapOffset = session === 'Race' ? lap + 40 : lap;
    const trackEvo = 1.25 * (1.0 - Math.exp(-sessionLapOffset / 120.0));

    // Dynamic degradation curve with thermal cliff onset around lap 19
    const massFactor = massScaling ? Math.pow(fuelRemaining / 35.0, 0.4) : 1.0;
    const tyreAge = lap;

    // Abrasion, graining, blistering rates
    const abrasion = 0.00018 * Math.pow(tyreAge / 10.0, 1.15) * massFactor * pushLevel;
    const graining = tyreAge <= 2 ? 0.00012 : 0.0;
    const blistering = tyreAge >= 17 ? 0.00035 * Math.pow((tyreAge - 16) / 4.0, 1.8) : 0.0;
    const totalWearRate = abrasion + graining + blistering;
    const cumulativeDamage = Math.min(1.0, 0.04 + totalWearRate * tyreAge * 12.0);

    // Pace delta from wear
    const wearPaceLoss = (0.075 * tyreAge + (tyreAge > 18 ? 0.018 * Math.pow(tyreAge - 18, 2) : 0.002 * Math.pow(tyreAge, 2))) * (1.0 + (1.0 - pushLevel) * 0.2);

    // Cleaned pace
    const paceCorrected = basePace + wearPaceLoss;

    // Raw lap time: pace_corrected + fuel - trackEvo + noise
    let noise = ((lap * 37) % 17 - 8) * 0.025;
    let outlierReason: string | null = null;

    if (lap === 7 && session === 'Race') {
      noise += 2.85; // Traffic delay
      outlierReason = 'Traffic Spike (+2.85s behind Bottas)';
    } else if (lap === 14 && session === 'Race') {
      noise += 3.10; // Yellow flag sector 2
      outlierReason = 'Yellow Flag Slowdown (+3.10s Sector 2)';
    }

    const rawLapTime = paceCorrected + fuelPenalty - trackEvo + noise;
    const predictedPace = basePace + 0.072 * tyreAge + 0.0025 * Math.pow(tyreAge, 2);

    // Thermal stack per wheel
    const flBaseTread = 98.0 + (tyreAge * 0.9) + aeroHeatDelta * 0.4 + (tyreAge > 18 ? 8.0 : 0);
    const flBaseCarcass = 90.0 + (tyreAge * 0.7) + aeroHeatDelta * 0.2 + (tyreAge > 18 ? 6.0 : 0);

    points.push({
      lap_number: lap,
      raw_lap_time: Number(rawLapTime.toFixed(3)),
      fuel_remaining_kg: Number(fuelRemaining.toFixed(1)),
      fuel_penalty_s: Number(fuelPenalty.toFixed(3)),
      track_evolution_s: Number(trackEvo.toFixed(3)),
      pace_corrected_s: Number(paceCorrected.toFixed(3)),
      predicted_pace_s: Number(predictedPace.toFixed(3)),
      limiting_corner: 'FL',
      outlier_reason: outlierReason,
      corners: {
        FL: {
          workload_share: 0.362,
          tread_temp_c: Number(flBaseTread.toFixed(1)),
          carcass_temp_c: Number(flBaseCarcass.toFixed(1)),
          abrasion_rate: Number((abrasion * 0.40).toFixed(5)),
          graining_rate: Number((graining * 0.50).toFixed(5)),
          blistering_rate: Number((blistering * 0.55).toFixed(5)),
          cumulative_damage: Number(cumulativeDamage.toFixed(3)),
          is_limiting: true,
        },
        FR: {
          workload_share: 0.181,
          tread_temp_c: Number((flBaseTread - 13.8).toFixed(1)),
          carcass_temp_c: Number((flBaseCarcass - 11.5).toFixed(1)),
          abrasion_rate: Number((abrasion * 0.18).toFixed(5)),
          graining_rate: Number((graining * 0.20).toFixed(5)),
          blistering_rate: Number((blistering * 0.15).toFixed(5)),
          cumulative_damage: Number((cumulativeDamage * 0.52).toFixed(3)),
          is_limiting: false,
        },
        RL: {
          workload_share: 0.276,
          tread_temp_c: Number((flBaseTread - 5.6).toFixed(1)),
          carcass_temp_c: Number((flBaseCarcass - 3.2).toFixed(1)),
          abrasion_rate: Number((abrasion * 0.28).toFixed(5)),
          graining_rate: Number((graining * 0.15).toFixed(5)),
          blistering_rate: Number((blistering * 0.20).toFixed(5)),
          cumulative_damage: Number((cumulativeDamage * 0.78).toFixed(3)),
          is_limiting: false,
        },
        RR: {
          workload_share: 0.181,
          tread_temp_c: Number((flBaseTread - 15.9).toFixed(1)),
          carcass_temp_c: Number((flBaseCarcass - 13.1).toFixed(1)),
          abrasion_rate: Number((abrasion * 0.14).toFixed(5)),
          graining_rate: Number((graining * 0.15).toFixed(5)),
          blistering_rate: Number((blistering * 0.10).toFixed(5)),
          cumulative_damage: Number((cumulativeDamage * 0.49).toFixed(3)),
          is_limiting: false,
        },
      },
    });
  }

  return points;
}
