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
import { LineChart, Filter, AlertCircle } from 'lucide-react';

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
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={telemetryData}
            margin={{ top: 10, right: 25, left: -5, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#242432" opacity={0.6} />
            
            {/* X Axis: Lap Number */}
            <XAxis
              dataKey="lap_number"
              stroke="#8C8C9A"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
              label={{
                value: 'Lap Number',
                position: 'insideBottom',
                offset: -2,
                fill: '#8C8C9A',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
            />

            {/* Left Y Axis: Lap Time (Seconds) */}
            <YAxis
              yAxisId="left"
              stroke="#8C8C9A"
              fontSize={11}
              fontFamily="JetBrains Mono"
              domain={['auto', 'auto']}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}s`}
              label={{
                value: 'Pace (s)',
                angle: -90,
                position: 'insideLeft',
                fill: '#8C8C9A',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
                offset: 12,
              }}
            />

            {/* Right Y Axis: Confounder Delta (Seconds) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#00E5FF"
              fontSize={10}
              fontFamily="JetBrains Mono"
              domain={[-1.5, 3.8]}
              tickLine={false}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`}
              label={{
                value: 'Confounder Δ (s)',
                angle: 90,
                position: 'insideRight',
                fill: '#00E5FF',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
                offset: 12,
              }}
            />

            {/* Custom Telemetry Tooltip with explicit units */}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as LapTelemetryRecord;
                  return (
                    <div className="bg-[#0e0e16] border border-haas-border p-3 rounded-lg shadow-2xl font-mono text-xs max-w-xs">
                      <div className="flex items-center justify-between border-b border-haas-border pb-1.5 mb-2">
                        <span className="font-extrabold text-haas-white">LAP {data.lap_number} (Tyre Age: {data.tyre_life} laps)</span>
                        <span className="text-[10px] text-haas-gray">Fuel: {data.fuel_remaining_kg} kg</span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-haas-gray">Series 1: Raw Lap:</span>
                          <span className="text-haas-white font-bold">{data.raw_lap_time.toFixed(3)} s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-haas-red">Series 2: Fuel Penalty:</span>
                          <span className="text-haas-red font-medium">+{data.fuel_penalty_s.toFixed(3)} s (0.033 s/kg)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-haas-cyan">Series 3: Track Evolution:</span>
                          <span className="text-haas-cyan font-medium">-{data.track_evolution_s.toFixed(3)} s</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-haas-border/70">
                          <span className="text-haas-white font-extrabold">Series 4: Clean Residual:</span>
                          <span className="text-emerald-400 font-black">{data.pace_corrected_s.toFixed(3)} s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">TrackShift Physical Model:</span>
                          <span className="text-white font-medium">{data.predicted_pace_s.toFixed(3)} s</span>
                        </div>

                        {data.outlier_reason && (
                          <div className="mt-2 pt-1.5 border-t border-haas-red/40 text-haas-amber text-[10px] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-haas-amber flex-shrink-0" />
                            <span className="font-bold">{data.outlier_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
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
                stroke="#8C8C9A"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 2, fill: '#8C8C9A' }}
              />
            )}

            {/* Series 2: Dashed Red - Fuel Mass Penalty Curve (0.033 s/kg) on Right Y-Axis */}
            {showFuel && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="fuel_penalty_s"
                name="Series 2: Fuel Mass Penalty (0.033 s/kg)"
                stroke="#E10600"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}

            {/* Series 3: Dashed Cyan - Track Rubbering Evolution Curve on Right Y-Axis */}
            {showTrackEvo && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={(d: LapTelemetryRecord) => -d.track_evolution_s}
                name="Series 3: Track Rubbering Gain (1.25s * (1-e^-n/120))"
                stroke="#00E5FF"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            )}

            {/* Series 4: Solid Neon Red - Pace Corrected (True Degradation Signal) */}
            {showCleaned && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pace_corrected_s"
                name="Series 4: Pace Corrected (True Degradation Signal)"
                stroke="#FF1A1A"
                strokeWidth={3}
                dot={{ r: 3.5, fill: '#FF1A1A' }}
                activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#E10600', strokeWidth: 2 }}
              />
            )}

            {/* Outlier Markers: 7 PIP Filters (Traffic spikes, Yellow flags) */}
            {outliers.map((pt) => (
              <ReferenceDot
                yAxisId="left"
                key={pt.lap_number}
                x={pt.lap_number}
                y={pt.raw_lap_time}
                r={6}
                fill="#FF9100"
                stroke="#0B0B0E"
                strokeWidth={2}
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
