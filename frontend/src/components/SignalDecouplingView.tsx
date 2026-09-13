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
import { MetricBadge } from './shared/F1DataComponents';
import {
  TelemetryReadoutTooltip,
  computePaceDomain,
  computeDeltaDomain,
  TELEMETRY_THEME,
} from './shared/TelemetryChartComponents';

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

  // Dynamic engineering axis domain calculations (avoid zero-compression)
  const paceValues = telemetryData.flatMap((d) => [d.raw_lap_time, d.pace_corrected_s]);
  const paceDomain = computePaceDomain(paceValues, 0.4);
  const deltaValues = telemetryData.flatMap((d) => [d.fuel_penalty_s, -d.track_evolution_s]);
  const deltaDomain = computeDeltaDomain(deltaValues, 0.25);

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
      <div className="f1-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="f1-display text-base tracking-wider text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#E10600]" />
              <span>WORKSPACE 2: SIGNAL DECOUPLING ENGINE</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Isolation of true tyre degradation from fuel mass penalty and track evolution gain
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 font-sans">
            <span className="font-display uppercase tracking-wider font-bold">Filtered Outliers:</span>
            <MetricBadge
              text={`${outliers.length} LAPS PURGED`}
              type="tag"
              className="bg-amber-950/50 text-amber-300 border-amber-800/50"
            />
          </div>
        </div>

        {/* 7 Stage Domain Filter Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4 text-xs">
          <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] font-display tracking-widest uppercase font-bold">Stage 1: Flag</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px] font-sans">
              <CheckCircle2 className="w-3.5 h-3.5" /> Green Flag
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] font-display tracking-widest uppercase font-bold">Stage 2: Limits</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px] font-sans">
              <CheckCircle2 className="w-3.5 h-3.5" /> Track Limits
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] font-display tracking-widest uppercase font-bold">Stage 3: In/Out</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px] font-sans">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pit Purged
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] font-display tracking-widest uppercase font-bold">Stage 4: SC/VSC</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px] font-sans">
              <CheckCircle2 className="w-3.5 h-3.5" /> Delta Excluded
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] font-display tracking-widest uppercase font-bold">Stage 5: Traffic</div>
            <div className="font-semibold text-amber-400 flex items-center gap-1.5 mt-1 text-[11px] font-sans">
              <AlertTriangle className="w-3.5 h-3.5" /> &gt;1.5s Wake
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] font-display tracking-widest uppercase font-bold">Stage 6: Delta</div>
            <div className="font-semibold text-amber-400 flex items-center gap-1.5 mt-1 text-[11px] font-sans">
              <AlertTriangle className="w-3.5 h-3.5" /> {outliers.length} Purged
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] font-display tracking-widest uppercase font-bold">Stage 7: Weather</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1 text-[11px] font-sans">
              <CheckCircle2 className="w-3.5 h-3.5" /> 0.0mm Dry
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Analytical Line Graph */}
      <div className="f1-card p-5">
        
        {/* Chart Header & Interactive Series Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="f1-display text-sm tracking-wide text-white">
              Signal Decoupling: Observed Pace vs Confounder Residuals
            </h3>
            <span className="text-xs text-zinc-400 font-sans">
              Left: Lap Pace (Seconds) | Right: Confounder Corrections (Delta Seconds)
            </span>
          </div>

          {/* Series Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`f1-pill px-3 py-1 rounded-full border transition-all text-xs ${
                showRaw
                  ? 'bg-zinc-800/80 text-white border-zinc-500'
                  : 'bg-transparent text-zinc-500 border-white/[0.08]'
              }`}
            >
              Raw Pace (Laps)
            </button>
            <button
              onClick={() => setShowFuel(!showFuel)}
              className={`f1-pill px-3 py-1 rounded-full border transition-all text-xs ${
                showFuel
                  ? 'bg-red-950/60 text-red-300 border-red-700/60'
                  : 'bg-transparent text-zinc-500 border-white/[0.08]'
              }`}
            >
              Fuel Penalty
            </button>
            <button
              onClick={() => setShowTrackEvo(!showTrackEvo)}
              className={`f1-pill px-3 py-1 rounded-full border transition-all text-xs ${
                showTrackEvo
                  ? 'bg-sky-950/60 text-sky-300 border-sky-700/60'
                  : 'bg-transparent text-zinc-500 border-white/[0.08]'
              }`}
            >
              Track Evo
            </button>
            <button
              onClick={() => setShowCleaned(!showCleaned)}
              className={`f1-pill px-3 py-1 rounded-full border transition-all text-xs ${
                showCleaned
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-transparent text-zinc-500 border-white/[0.08]'
              }`}
            >
              Decoupled Signal
            </button>
          </div>
        </div>

        {/* High-Density ATLAS / MoTeC Telemetry Chart Container */}
        <div className="w-full h-[400px] bg-[#080A0E] rounded-lg border border-white/[0.08] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={telemetryData}
              margin={{ top: 15, right: 25, left: 10, bottom: 10 }}
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
                  offset: -6,
                  fill: TELEMETRY_THEME.tickColor,
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.08em',
                }}
              />

              {/* Left Y Axis: Lap Time in Seconds (Dynamically Bounded) */}
              <YAxis
                yAxisId="left"
                stroke={TELEMETRY_THEME.axisLineColor}
                tick={{ fill: '#D1D5DB', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                domain={paceDomain}
                tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
                axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
                tickFormatter={(v) => `${v.toFixed(2)}s`}
                label={{
                  value: 'P_lap [s]',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#D1D5DB',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  offset: 8,
                }}
              />

              {/* Right Y Axis: Confounder Delta in Seconds (Dynamically Bounded) */}
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
                  offset: 8,
                }}
              />

              {/* High-Density ATLAS Cursor Telemetry Readout */}
              <Tooltip
                cursor={{ stroke: TELEMETRY_THEME.cursorLineColor, strokeWidth: 1, strokeDasharray: '2 2' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as LapTelemetryRecord;
                    return (
                      <TelemetryReadoutTooltip
                        active={active}
                        title={`LAP ${data.lap_number} TELEMETRY`}
                        subtitle={`${data.fuel_remaining_kg.toFixed(1)} kg fuel`}
                        items={[
                          {
                            channel: 'RAW PACE',
                            value: data.raw_lap_time.toFixed(3),
                            unit: 's',
                            color: TELEMETRY_THEME.channels.slateReference,
                          },
                          {
                            channel: 'FUEL PENALTY',
                            value: data.fuel_penalty_s.toFixed(3),
                            unit: 's',
                            color: TELEMETRY_THEME.channels.haasRed,
                            isDelta: true,
                          },
                          {
                            channel: 'TRACK EVO',
                            value: (-data.track_evolution_s).toFixed(3),
                            unit: 's',
                            color: TELEMETRY_THEME.channels.telemetryCyan,
                            isDelta: true,
                          },
                          {
                            channel: 'DECOUPLED PACE',
                            value: data.pace_corrected_s.toFixed(3),
                            unit: 's',
                            color: TELEMETRY_THEME.channels.laserWhite,
                            isProminent: true,
                          },
                        ]}
                        alertMessage={
                          data.outlier_reason
                            ? `${data.outlier_reason} [${data.pip_filter_tag}]`
                            : undefined
                        }
                        alertType="warning"
                      />
                    );
                  }
                  return null;
                }}
              />

              {/* Series 1: Raw Lap Time (Thin reference dash, 1.2px) */}
              {showRaw && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="raw_lap_time"
                  name="Raw Lap Time"
                  stroke={TELEMETRY_THEME.channels.slateReference}
                  strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                  strokeDasharray="2 2"
                  dot={false}
                  activeDot={{
                    r: 3,
                    stroke: TELEMETRY_THEME.channels.slateReference,
                    strokeWidth: 1.5,
                    fill: '#080A0E',
                  }}
                />
              )}

              {/* Series 2: Fuel Mass Correction (Haas Red, 1.2px) */}
              {showFuel && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="fuel_penalty_s"
                  name="Fuel Mass Penalty"
                  stroke={TELEMETRY_THEME.channels.haasRed}
                  strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{
                    r: 3,
                    stroke: TELEMETRY_THEME.channels.haasRed,
                    strokeWidth: 1.5,
                    fill: '#080A0E',
                  }}
                />
              )}

              {/* Series 3: Track Evolution Gain (Telemetry Cyan, 1.2px) */}
              {showTrackEvo && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={(d: LapTelemetryRecord) => -d.track_evolution_s}
                  name="Track Evolution Gain"
                  stroke={TELEMETRY_THEME.channels.telemetryCyan}
                  strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{
                    r: 3,
                    stroke: TELEMETRY_THEME.channels.telemetryCyan,
                    strokeWidth: 1.5,
                    fill: '#080A0E',
                  }}
                />
              )}

              {/* Series 4: Decoupled Performance Signal (Laser White, 1.5px) */}
              {showCleaned && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pace_corrected_s"
                  name="Decoupled Signal"
                  stroke={TELEMETRY_THEME.channels.laserWhite}
                  strokeWidth={TELEMETRY_THEME.strokeWidth.primary}
                  dot={false}
                  activeDot={{
                    r: 3.5,
                    stroke: TELEMETRY_THEME.channels.telemetryCyan,
                    strokeWidth: 2,
                    fill: '#FFFFFF',
                  }}
                />
              )}

              {/* Filtered Outlier Markers: Precision 3.5px warning rings (No clumsy solid dots) */}
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

      </div>

      {/* Filtered Laps & PIP Audit Table */}
      <div className="f1-card p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
          <div>
            <h3 className="f1-display text-sm tracking-wide text-white">
              Filtered Laps & Domain Audit Table
            </h3>
            <span className="text-xs text-zinc-400 font-sans">
              7-stage domain sanitization log (observed raw time vs decoupled true signal)
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-sans">
            Total Stint Laps: <strong className="text-white font-mono tabular-nums">{telemetryData.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-500 text-[10px] font-display uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3 font-medium">Lap</th>
                <th className="py-2.5 px-3 font-medium">Raw Time</th>
                <th className="py-2.5 px-3 font-medium">Fuel Delta</th>
                <th className="py-2.5 px-3 font-medium">Evo Delta</th>
                <th className="py-2.5 px-3 font-medium">Clean Pace</th>
                <th className="py-2.5 px-3 text-right font-medium">PIP Filter Tag</th>
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
                    <td className="py-2.5 px-3 font-semibold text-white font-sans flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOutlier ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span>Lap {String(d.lap_number).padStart(2, '0')}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">{d.raw_lap_time.toFixed(3)}s</td>
                    <td className="py-2.5 px-3 text-red-400">+{d.fuel_penalty_s.toFixed(3)}s</td>
                    <td className="py-2.5 px-3 text-sky-400">-{d.track_evolution_s.toFixed(3)}s</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{d.pace_corrected_s.toFixed(3)}s</td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <MetricBadge
                        text={d.pip_filter_tag || 'PASS_GREEN'}
                        type="tag"
                        className={getTagBadgeClass(d.pip_filter_tag)}
                      />
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
