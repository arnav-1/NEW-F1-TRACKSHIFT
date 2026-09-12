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
import type { LapTelemetryPoint } from '../types/telemetry';
import { LineChart, Filter, AlertCircle } from 'lucide-react';

interface ConfounderDecoupleChartProps {
  telemetryData: LapTelemetryPoint[];
}

export const ConfounderDecoupleChart: React.FC<ConfounderDecoupleChartProps> = ({
  telemetryData,
}) => {
  const [showRaw, setShowRaw] = useState(true);
  const [showCleaned, setShowCleaned] = useState(true);
  const [showPredicted, setShowPredicted] = useState(true);

  // Filter outlier points for overlay markers
  const outliers = telemetryData.filter((d) => d.outlier_reason);

  return (
    <div className="pitwall-panel p-4 h-full flex flex-col justify-between">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-haas-border/70 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-haas-red" />
          <h2 className="text-sm font-bold tracking-tight text-haas-white font-mono uppercase">
            Panel 2: Observational Confounder Decoupling (PIP & IEP)
          </h2>
        </div>

        {/* Legend Filter Toggles */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`px-2 py-0.5 rounded border transition-all ${
              showRaw
                ? 'bg-[#181824] text-haas-gray border-haas-border'
                : 'opacity-40 line-through text-haas-gray border-transparent'
            }`}
          >
            Raw Lap Time
          </button>
          <button
            onClick={() => setShowCleaned(!showCleaned)}
            className={`px-2 py-0.5 rounded border transition-all ${
              showCleaned
                ? 'bg-haas-red/20 text-haas-red border-haas-red/50 font-bold'
                : 'opacity-40 line-through text-haas-gray border-transparent'
            }`}
          >
            Cleaned Residual Pace
          </button>
          <button
            onClick={() => setShowPredicted(!showPredicted)}
            className={`px-2 py-0.5 rounded border transition-all ${
              showPredicted
                ? 'bg-cyan-950/40 text-haas-cyan border-cyan-500/40'
                : 'opacity-40 line-through text-haas-gray border-transparent'
            }`}
          >
            Predicted Physics
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={telemetryData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#242432" opacity={0.6} />
            <XAxis
              dataKey="lap_number"
              stroke="#8C8C9A"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
              label={{ value: 'Lap Number', position: 'insideBottom', offset: -2, fill: '#8C8C9A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              stroke="#8C8C9A"
              fontSize={11}
              fontFamily="JetBrains Mono"
              domain={['auto', 'auto']}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}s`}
            />

            {/* Custom Telemetry Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as LapTelemetryPoint;
                  return (
                    <div className="bg-[#0e0e16] border border-haas-border p-3 rounded-md shadow-2xl font-mono text-xs max-w-xs">
                      <div className="flex items-center justify-between border-b border-haas-border pb-1.5 mb-2">
                        <span className="font-bold text-haas-white">LAP {data.lap_number}</span>
                        <span className="text-[10px] text-haas-gray">Fuel: {data.fuel_remaining_kg} kg</span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-haas-gray">Raw Lap Time:</span>
                          <span className="text-haas-white font-bold">{data.raw_lap_time.toFixed(3)}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-haas-red">Fuel Weight Penalty:</span>
                          <span className="text-haas-red font-medium">+{data.fuel_penalty_s.toFixed(3)}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-haas-cyan">Track Evolution Gain:</span>
                          <span className="text-haas-cyan font-medium">-{data.track_evolution_s.toFixed(3)}s</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-haas-border/60">
                          <span className="text-haas-white font-bold">Clean Residual:</span>
                          <span className="text-emerald-400 font-black">{data.pace_corrected_s.toFixed(3)}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-haas-cyan">Physics Prediction:</span>
                          <span className="text-cyan-400 font-medium">{data.predicted_pace_s.toFixed(3)}s</span>
                        </div>

                        {data.outlier_reason && (
                          <div className="mt-2 pt-1 border-t border-haas-red/40 text-haas-amber text-[10px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-haas-amber flex-shrink-0" />
                            <span>{data.outlier_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Raw Pace Line */}
            {showRaw && (
              <Line
                type="monotone"
                dataKey="raw_lap_time"
                name="Raw Lap Time (Confounded)"
                stroke="#8C8C9A"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ r: 2, fill: '#8C8C9A' }}
              />
            )}

            {/* Cleaned Residual Pace (The True Signal) */}
            {showCleaned && (
              <Line
                type="monotone"
                dataKey="pace_corrected_s"
                name="Cleaned Residual Pace (Tyre Only)"
                stroke="#E10600"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#E10600' }}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#E10600', strokeWidth: 2 }}
              />
            )}

            {/* Predicted Physics Model Line */}
            {showPredicted && (
              <Line
                type="monotone"
                dataKey="predicted_pace_s"
                name="TrackShift Physics Model"
                stroke="#00E5FF"
                strokeWidth={2}
                dot={false}
              />
            )}

            {/* Mark anomalous traffic outliers */}
            {outliers.map((pt) => (
              <ReferenceDot
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

      {/* Explanatory Caption */}
      <div className="mt-2 pt-2 border-t border-haas-border/70 flex items-center justify-between text-[11px] font-mono text-haas-gray">
        <span className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-haas-red" />
          <span>Decoupling equation: <code>Pace_clean = LapTime_raw - Fuel_penalty + Track_evo</code></span>
        </span>
        <span className="text-haas-amber flex items-center gap-1 font-semibold">
          <span className="w-2 h-2 rounded-full bg-haas-amber inline-block"></span>
          2 Outliers Purged by 7-Stage Filter
        </span>
      </div>
    </div>
  );
};
