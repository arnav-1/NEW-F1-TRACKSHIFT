import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import type { LapTelemetryRecord } from '../types/telemetry';
import { LineChart, Filter } from 'lucide-react';
import {
  TelemetryReadoutTooltip,
  computePaceDomain,
  computeDeltaDomain,
  TELEMETRY_THEME,
} from './shared/TelemetryChartComponents';

interface ConfounderDecoupleChartProps {
  telemetryData: LapTelemetryRecord[];
}

export const ConfounderDecoupleChart: React.FC<ConfounderDecoupleChartProps> = ({
  telemetryData,
}) => {
  const [showRaw, setShowRaw] = useState(true);
  const [showFuel, setShowFuel] = useState(true);
  const [showTrackEvo, setShowTrackEvo] = useState(true);
  const [showCleaned, setShowCleaned] = useState(true);

  // Filter outlier points (e.g., traffic spike, yellow flags)
  const outliers = telemetryData.filter((d) => d.is_outlier || d.outlier_reason);

  const paceValues = telemetryData.flatMap((d) => [d.raw_lap_time, d.pace_corrected_s]);
  const paceDomain = computePaceDomain(paceValues, 0.4);
  const deltaValues = telemetryData.flatMap((d) => [d.fuel_penalty_s, -d.track_evolution_s]);
  const deltaDomain = computeDeltaDomain(deltaValues, 0.25);

  return (
    <div className="pitwall-panel p-4 h-full flex flex-col justify-between">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-haas-border/70 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-haas-red" />
          <h2 className="text-sm font-bold text-haas-white font-mono">
            Panel 2: Confounder Decoupling & Track Evolution (PIP)
          </h2>
        </div>

        {/* Legend Filter Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`px-2 py-0.5 rounded border transition-all ${
              showRaw
                ? 'bg-[#181824] text-haas-gray border-haas-border'
                : 'opacity-40 line-through text-haas-gray border-transparent'
            }`}
          >
            Series 1: Raw Lap
          </button>
          <button
            onClick={() => setShowFuel(!showFuel)}
            className={`px-2 py-0.5 rounded border transition-all ${
              showFuel
                ? 'bg-haas-red/20 text-haas-red border-haas-red/40 font-bold'
                : 'opacity-40 line-through text-haas-gray border-transparent'
            }`}
          >
            Series 2: Fuel Penalty
          </button>
          <button
            onClick={() => setShowTrackEvo(!showTrackEvo)}
            className={`px-2 py-0.5 rounded border transition-all ${
              showTrackEvo
                ? 'bg-cyan-950/40 text-haas-cyan border-cyan-500/40 font-bold'
                : 'opacity-40 line-through text-haas-gray border-transparent'
            }`}
          >
            Series 3: Track Evo
          </button>
          <button
            onClick={() => setShowCleaned(!showCleaned)}
            className={`px-2 py-0.5 rounded border transition-all ${
              showCleaned
                ? 'bg-haas-red text-white border-haas-red font-bold shadow-sm shadow-haas-red/50'
                : 'opacity-40 line-through text-haas-gray border-transparent'
            }`}
          >
            Series 4: Cleaned Pace (Signal)
          </button>
        </div>
      </div>

      {/* Dual-Axis Chart Canvas */}
      <div className="w-full h-[280px] bg-[#080A0E] rounded-lg border border-white/[0.08] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={telemetryData}
            margin={{ top: 10, right: 25, left: -5, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray={TELEMETRY_THEME.gridDash}
              stroke={TELEMETRY_THEME.gridColor}
            />
            
            {/* X Axis: Lap Number */}
            <XAxis
              dataKey="lap_number"
              stroke={TELEMETRY_THEME.axisLineColor}
              tick={{ fill: TELEMETRY_THEME.tickColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
              axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
              label={{
                value: 'LAP NUMBER',
                position: 'insideBottom',
                offset: -2,
                fill: TELEMETRY_THEME.tickColor,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />

            {/* Left Y Axis: Lap Time (Seconds) */}
            <YAxis
              yAxisId="left"
              stroke={TELEMETRY_THEME.axisLineColor}
              tick={{ fill: '#D1D5DB', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              domain={paceDomain}
              tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
              axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
              tickFormatter={(v) => `${v.toFixed(1)}s`}
              label={{
                value: 'P_lap [s]',
                angle: -90,
                position: 'insideLeft',
                fill: '#D1D5DB',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                offset: 12,
              }}
            />

            {/* Right Y Axis: Confounder Delta (Seconds) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={TELEMETRY_THEME.axisLineColor}
              tick={{ fill: TELEMETRY_THEME.channels.telemetryCyan, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              domain={deltaDomain}
              tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
              axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`}
              label={{
                value: 'Δ_residual [s]',
                angle: 90,
                position: 'insideRight',
                fill: TELEMETRY_THEME.channels.telemetryCyan,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                offset: 12,
              }}
            />

            {/* Custom Telemetry Tooltip with explicit units */}
            <Tooltip
              cursor={{ stroke: TELEMETRY_THEME.cursorLineColor, strokeWidth: 1, strokeDasharray: '2 2' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as LapTelemetryRecord;
                  return (
                    <TelemetryReadoutTooltip
                      active={active}
                      title={`LAP ${data.lap_number} (TYRE AGE: ${data.tyre_life} L)`}
                      subtitle={`FUEL: ${data.fuel_remaining_kg.toFixed(1)} KG`}
                      items={[
                        { channel: 'RAW LAP', value: data.raw_lap_time.toFixed(3), unit: 's', color: TELEMETRY_THEME.channels.slateReference },
                        { channel: 'FUEL PENALTY', value: data.fuel_penalty_s.toFixed(3), unit: 's', color: TELEMETRY_THEME.channels.haasRed, isDelta: true },
                        { channel: 'TRACK EVOLUTION', value: (-data.track_evolution_s).toFixed(3), unit: 's', color: TELEMETRY_THEME.channels.telemetryCyan, isDelta: true },
                        { channel: 'CLEAN RESIDUAL', value: data.pace_corrected_s.toFixed(3), unit: 's', color: TELEMETRY_THEME.channels.laserWhite, isProminent: true },
                      ]}
                      alertMessage={data.outlier_reason || undefined}
                      alertType="warning"
                    />
                  );
                }
                return null;
              }}
            />

            {/* Series 1: Dotted Gray - Raw Observed Lap Time */}
            {showRaw && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="raw_lap_time"
                name="Series 1: Raw Observed Lap Time (Noisy)"
                stroke={TELEMETRY_THEME.channels.slateReference}
                strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                strokeDasharray="2 2"
                dot={false}
                activeDot={{ r: 3, stroke: TELEMETRY_THEME.channels.slateReference, strokeWidth: 1.5, fill: '#080A0E' }}
              />
            )}

            {/* Series 2: Dashed Red - Fuel Mass Penalty Curve */}
            {showFuel && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="fuel_penalty_s"
                name="Series 2: Fuel Mass Penalty"
                stroke={TELEMETRY_THEME.channels.haasRed}
                strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 3, stroke: TELEMETRY_THEME.channels.haasRed, strokeWidth: 1.5, fill: '#080A0E' }}
              />
            )}

            {/* Series 3: Dashed Cyan - Track Rubbering Evolution Curve */}
            {showTrackEvo && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={(d: LapTelemetryRecord) => -d.track_evolution_s}
                name="Series 3: Track Rubbering Gain"
                stroke={TELEMETRY_THEME.channels.telemetryCyan}
                strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 3, stroke: TELEMETRY_THEME.channels.telemetryCyan, strokeWidth: 1.5, fill: '#080A0E' }}
              />
            )}

            {/* Series 4: Decoupled Signal */}
            {showCleaned && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pace_corrected_s"
                name="Series 4: Pace Corrected"
                stroke={TELEMETRY_THEME.channels.laserWhite}
                strokeWidth={TELEMETRY_THEME.strokeWidth.primary}
                dot={false}
                activeDot={{ r: 3.5, stroke: TELEMETRY_THEME.channels.telemetryCyan, strokeWidth: 2, fill: '#FFFFFF' }}
              />
            )}

            {/* Outlier Markers: Precision hollow reticles */}
            {outliers.map((pt) => (
              <ReferenceDot
                yAxisId="left"
                key={pt.lap_number}
                x={pt.lap_number}
                y={pt.raw_lap_time}
                r={3.5}
                fill="#080A0E"
                stroke={TELEMETRY_THEME.channels.amberWarning}
                strokeWidth={1.5}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory Filter Footer */}
      <div className="mt-2 pt-2 border-t border-haas-border/70 flex flex-wrap items-center justify-between text-[11px] font-mono text-haas-gray gap-2">
        <span className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-haas-red" />
          <span>Decoupling equation: <code>Pace_corrected = LapTime_raw - (0.033 × M_fuel) + 1.25(1 - e^(-n/120))</code></span>
        </span>
        <span className="text-haas-amber flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-haas-amber inline-block"></span>
          <span>Filtered PIP Outliers: {outliers.length} Excluded (Traffic / Yellows)</span>
        </span>
      </div>
    </div>
  );
};
