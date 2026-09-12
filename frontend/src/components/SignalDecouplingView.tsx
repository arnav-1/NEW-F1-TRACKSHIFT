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
import { Filter, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SignalDecouplingViewProps {
  telemetryData: LapTelemetryRecord[];
}

export const SignalDecouplingView: React.FC<SignalDecouplingViewProps> = ({
  telemetryData,
}) => {
  const [showRaw, setShowRaw] = useState(true);
  const [showFuel, setShowFuel] = useState(true);
  const [showTrackEvo, setShowTrackEvo] = useState(true);
  const [showCleaned, setShowCleaned] = useState(true);

  // Outlier points flagged by PIP domain filters
  const outliers = telemetryData.filter((d) => d.is_outlier || d.outlier_reason);

  const getTagBadgeClass = (tag?: string) => {
    switch (tag) {
      case 'PASS_GREEN':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      case 'REJECTED_TRAFFIC_SPIKE':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/40 font-semibold';
      case 'REJECTED_VSC_DELTA':
      case 'REJECTED_YELLOW_FLAG':
        return 'bg-orange-950/40 text-orange-300 border-orange-800/40 font-semibold';
      case 'OUT_LAP':
        return 'bg-purple-950/40 text-purple-300 border-purple-800/40 font-semibold';
      default:
        return 'bg-white/[0.04] text-zinc-400 border-white/[0.08]';
    }
  };

  return (
    <div className="space-y-5 font-sans">
      
      {/* Top Telemetry Filter Status Banner */}
      <div className="tgr-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-red-500" />
              <span>Workspace 2: Signal Decoupling Engine</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Isolation of true tyre degradation from fuel mass penalty and track evolution gain
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>Filtered Outliers:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-300 font-semibold text-[10px]">
              {outliers.length} Laps Purged
            </span>
          </div>
        </div>

        {/* 7 Stage Domain Filter Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4 text-xs">
          <div className="bg-[#0A0C0F] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-500 text-[10px] tracking-wider uppercase font-medium">Stage 1: Flag</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Green Flag
            </div>
          </div>

          <div className="bg-[#0A0C0F] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-500 text-[10px] tracking-wider uppercase font-medium">Stage 2: Limits</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Track Limits
            </div>
          </div>

          <div className="bg-[#0A0C0F] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-500 text-[10px] tracking-wider uppercase font-medium">Stage 3: In/Out</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pit Purged
            </div>
          </div>

          <div className="bg-[#0A0C0F] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-500 text-[10px] tracking-wider uppercase font-medium">Stage 4: SC/VSC</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Delta Excluded
            </div>
          </div>

          <div className="bg-[#0A0C0F] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-500 text-[10px] tracking-wider uppercase font-medium">Stage 5: Traffic</div>
            <div className="font-semibold text-amber-400 flex items-center gap-1.5 mt-1 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" /> &gt;1.5s Wake
            </div>
          </div>

          <div className="bg-[#0A0C0F] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-500 text-[10px] tracking-wider uppercase font-medium">Stage 6: Delta</div>
            <div className="font-semibold text-amber-400 flex items-center gap-1.5 mt-1 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" /> {outliers.length} Purged
            </div>
          </div>

          <div className="bg-[#0A0C0F] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-500 text-[10px] tracking-wider uppercase font-medium">Stage 7: Weather</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> 0.0mm Dry
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Analytical Line Graph */}
      <div className="tgr-card p-5">
        
        {/* Chart Header & Interactive Series Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Signal Decoupling: Observed Pace vs Confounder Residuals
            </h3>
            <span className="text-xs text-zinc-400">
              Left: Lap Pace (Seconds) | Right: Confounder Corrections (Delta Seconds)
            </span>
          </div>

          {/* Series Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                showRaw
                  ? 'bg-white/[0.08] text-zinc-200 border-white/[0.15]'
                  : 'text-zinc-500 border-dashed border-white/[0.08] line-through'
              }`}
            >
              Raw Lap Time
            </button>

            <button
              onClick={() => setShowFuel(!showFuel)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                showFuel
                  ? 'bg-red-950/40 text-red-400 border-red-800/50'
                  : 'text-zinc-500 border-dashed border-white/[0.08] line-through'
              }`}
            >
              Fuel Mass Penalty (-0.033 s/kg)
            </button>

            <button
              onClick={() => setShowTrackEvo(!showTrackEvo)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                showTrackEvo
                  ? 'bg-sky-950/40 text-sky-400 border-sky-800/50'
                  : 'text-zinc-500 border-dashed border-white/[0.08] line-through'
              }`}
            >
              Track Evolution Gain
            </button>

            <button
              onClick={() => setShowCleaned(!showCleaned)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                showCleaned
                  ? 'bg-[#1E232F] text-zinc-100 border-white/[0.2] font-semibold'
                  : 'text-zinc-500 border-dashed border-white/[0.08] line-through'
              }`}
            >
              Decoupled Signal (True Wear)
            </button>
          </div>
        </div>

        {/* Large Recharts Container */}
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={telemetryData}
              margin={{ top: 15, right: 25, left: 5, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

              {/* X Axis: Lap Number */}
              <XAxis
                dataKey="lap_number"
                stroke="#6B7280"
                fontSize={10}
                fontFamily="Inter, sans-serif"
                tickLine={false}
                label={{
                  value: 'Stint Lap Number',
                  position: 'insideBottom',
                  offset: -6,
                  fill: '#9CA3AF',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                }}
              />

              {/* Left Y Axis: Lap Time in Seconds */}
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                domain={['auto', 'auto']}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}s`}
                label={{
                  value: 'Pace (s)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  offset: 5,
                }}
              />

              {/* Right Y Axis: Confounder Delta in Seconds */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#38BDF8"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                domain={[-1.6, 4.0]}
                tickLine={false}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`}
                label={{
                  value: 'Delta (s)',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#38BDF8',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  offset: 5,
                }}
              />

              {/* Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as LapTelemetryRecord;
                    return (
                      <div className="bg-[#12151C] border border-white/[0.1] p-3 rounded-lg shadow-xl text-xs max-w-xs">
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 mb-2 font-mono">
                          <span className="font-semibold text-zinc-100">Lap {data.lap_number}</span>
                          <span className="text-zinc-400">{data.fuel_remaining_kg} kg fuel</span>
                        </div>
                        <div className="space-y-1 text-[11px] font-mono tabular-nums">
                          <div className="flex justify-between">
                            <span className="text-zinc-400 font-sans">Raw Observed:</span>
                            <span className="font-semibold text-zinc-200">{data.raw_lap_time.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between text-red-400">
                            <span className="font-sans">Fuel Penalty:</span>
                            <span className="font-semibold">+{data.fuel_penalty_s.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between text-sky-400">
                            <span className="font-sans">Track Evolution:</span>
                            <span className="font-semibold">-{data.track_evolution_s.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-white/[0.08] text-xs">
                            <span className="font-semibold text-zinc-100 font-sans">Clean Residual:</span>
                            <span className="font-bold text-white">{data.pace_corrected_s.toFixed(3)}s</span>
                          </div>
                          {data.outlier_reason && (
                            <div className="mt-2 pt-1 border-t border-amber-500/30 text-amber-400 text-[10px] font-sans">
                              ⚠️ {data.outlier_reason} [{data.pip_filter_tag}]
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Series 1: Raw Lap Time (Muted slate, thin dotted line) */}
              {showRaw && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="raw_lap_time"
                  name="Raw Lap Time"
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={{ r: 2, fill: '#64748B' }}
                />
              )}

              {/* Series 2: Fuel Mass Correction (Muted Red, dashed line) */}
              {showFuel && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="fuel_penalty_s"
                  name="Fuel Mass Penalty"
                  stroke="#EF4444"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {/* Series 3: Track Evolution Gain (Cyan, dashed line) */}
              {showTrackEvo && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={(d: LapTelemetryRecord) => -d.track_evolution_s}
                  name="Track Evolution Gain"
                  stroke="#38BDF8"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {/* Series 4: Decoupled Performance Signal (Solid White, bold 2.5px stroke) */}
              {showCleaned && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pace_corrected_s"
                  name="Decoupled Signal"
                  stroke="#F3F4F6"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: '#F3F4F6' }}
                  activeDot={{ r: 5, fill: '#FFFFFF', stroke: '#E10600', strokeWidth: 2 }}
                />
              )}

              {/* Filtered Outlier Points on the Graph (Flagged by PIP) */}
              {outliers.map((pt) => (
                <ReferenceDot
                  yAxisId="left"
                  key={pt.lap_number}
                  x={pt.lap_number}
                  y={pt.raw_lap_time}
                  r={5}
                  fill="#F59E0B"
                  stroke="#0A0C0F"
                  strokeWidth={2}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Filtered Laps & PIP Audit Table */}
      <div className="tgr-card p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200 tracking-wider uppercase">
              Filtered Laps & Domain Audit Table
            </h3>
            <span className="text-[11px] text-zinc-400">
              7-stage domain sanitization log (observed raw time vs decoupled true signal)
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-sans">
            Total Stint Laps: <strong className="text-zinc-200 font-mono tabular-nums">{telemetryData.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-zinc-500 text-[10px] tracking-wider uppercase font-medium">
                <th className="py-2 px-3 font-medium">Lap</th>
                <th className="py-2 px-3 font-medium">Raw Time</th>
                <th className="py-2 px-3 font-medium">Fuel Delta</th>
                <th className="py-2 px-3 font-medium">Evo Delta</th>
                <th className="py-2 px-3 font-medium">Clean Pace</th>
                <th className="py-2 px-3 text-right font-medium">PIP Filter Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] tabular-nums font-mono">
              {telemetryData.map((d) => {
                const isOutlier = d.is_outlier;
                return (
                  <tr
                    key={d.lap_number}
                    className={`transition-colors ${
                      isOutlier ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-zinc-200">
                      {String(d.lap_number).padStart(2, '0')}
                    </td>
                    <td className="py-2 px-3 text-zinc-400">{d.raw_lap_time.toFixed(3)}s</td>
                    <td className="py-2 px-3 text-red-400">+{d.fuel_penalty_s.toFixed(3)}s</td>
                    <td className="py-2 px-3 text-sky-400">-{d.track_evolution_s.toFixed(3)}s</td>
                    <td className="py-2 px-3 font-semibold text-zinc-100">{d.pace_corrected_s.toFixed(3)}s</td>
                    <td className="py-2 px-3 text-right font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${getTagBadgeClass(d.pip_filter_tag)}`}>
                        {d.pip_filter_tag || 'PASS_GREEN'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
