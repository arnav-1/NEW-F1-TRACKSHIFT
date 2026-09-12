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
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
      case 'REJECTED_TRAFFIC_SPIKE':
        return 'bg-amber-950/40 text-[#D97706] border-amber-800/40 font-bold';
      case 'REJECTED_VSC_DELTA':
      case 'REJECTED_YELLOW_FLAG':
        return 'bg-orange-950/40 text-orange-400 border-orange-800/40 font-bold';
      case 'OUT_LAP':
        return 'bg-purple-950/40 text-purple-300 border-purple-800/40 font-bold';
      default:
        return 'bg-[#151520] text-[#8C8C9A] border-[#242432]';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Telemetry Filter Status Banner */}
      <div className="tgr-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#242432]">
          <div>
            <h2 className="text-base font-bold text-[#F5F5F7] flex items-center gap-2 font-mono">
              <Filter className="w-4 h-4 text-[#E10600]" />
              <span>WORKSPACE 2: SIGNAL DECOUPLING ENGINE</span>
            </h2>
            <p className="text-xs text-[#8C8C9A] font-mono mt-0.5">
              ISOLATION OF TRUE TYRE DEGRADATION FROM FUEL MASS PENALTY & TRACK EVOLUTION GAIN
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#8C8C9A]">
            <span>FILTERED OUTLIERS DETECTED:</span>
            <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-[#D97706] font-bold">
              {outliers.length} LAPS PURGED
            </span>
          </div>
        </div>

        {/* 7 Stage Domain Filter Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4 text-[11px] font-mono">
          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">STAGE 1: FLAG</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> GREEN FLAG
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">STAGE 2: LIMITS</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> TRACK LIMITS
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">STAGE 3: IN/OUT</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> PIT PURGED
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">STAGE 4: SC/VSC</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> DELTA EXCLUDED
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">STAGE 5: TRAFFIC</div>
            <div className="font-bold text-[#D97706] flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> &gt;1.5s WAKE
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">STAGE 6: DELTA</div>
            <div className="font-bold text-[#D97706] flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> {outliers.length} PURGED
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">STAGE 7: WEATHER</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> 0.0mm DRY
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Analytical Line Graph */}
      <div className="tgr-card p-6">
        
        {/* Chart Header & Interactive Series Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#242432]">
          <div>
            <h3 className="text-sm font-bold text-[#F5F5F7] font-mono tracking-wider">
              SIGNAL DECOUPLING: OBSERVED PACE VS CONFOUNDER RESIDUALS
            </h3>
            <span className="text-xs text-[#8C8C9A] font-mono">
              Left: Lap Pace (Seconds) | Right: Confounder Corrections (Delta Seconds)
            </span>
          </div>

          {/* Series Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showRaw
                  ? 'bg-[#181824] text-[#8C8C9A] border-[#38384D] font-bold'
                  : 'text-[#8C8C9A]/40 border-dashed border-[#242432] line-through'
              }`}
            >
              Raw Lap Time
            </button>

            <button
              onClick={() => setShowFuel(!showFuel)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showFuel
                  ? 'bg-red-950/40 text-[#E10600] border-red-800/60 font-bold'
                  : 'text-[#8C8C9A]/40 border-dashed border-[#242432] line-through'
              }`}
            >
              Fuel Mass Penalty (-0.033 s/kg)
            </button>

            <button
              onClick={() => setShowTrackEvo(!showTrackEvo)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showTrackEvo
                  ? 'bg-cyan-950/40 text-[#00E5FF] border-cyan-800/60 font-bold'
                  : 'text-[#8C8C9A]/40 border-dashed border-[#242432] line-through'
              }`}
            >
              Track Evolution Gain
            </button>

            <button
              onClick={() => setShowCleaned(!showCleaned)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showCleaned
                  ? 'bg-[#151520] text-[#F5F5F7] border-[#F5F5F7] font-bold'
                  : 'text-[#8C8C9A]/40 border-dashed border-[#242432] line-through'
              }`}
            >
              Decoupled Signal (True Wear)
            </button>
          </div>
        </div>

        {/* Large Recharts Container */}
        <div className="w-full h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={telemetryData}
              margin={{ top: 15, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E28" opacity={0.8} />

              {/* X Axis: Lap Number */}
              <XAxis
                dataKey="lap_number"
                stroke="#8C8C9A"
                fontSize={11}
                fontFamily="JetBrains Mono"
                tickLine={false}
                label={{
                  value: 'STINT LAP NUMBER',
                  position: 'insideBottom',
                  offset: -6,
                  fill: '#8C8C9A',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                }}
              />

              {/* Left Y Axis: Lap Time in Seconds */}
              <YAxis
                yAxisId="left"
                stroke="#F5F5F7"
                fontSize={11}
                fontFamily="JetBrains Mono"
                domain={['auto', 'auto']}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}s`}
                label={{
                  value: 'PACE (SECONDS)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#F5F5F7',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                  offset: 0,
                }}
              />

              {/* Right Y Axis: Confounder Delta in Seconds */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#00E5FF"
                fontSize={11}
                fontFamily="JetBrains Mono"
                domain={[-1.6, 4.0]}
                tickLine={false}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`}
                label={{
                  value: 'CONFOUNDER DELTA (SECONDS)',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#00E5FF',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                  offset: 0,
                }}
              />

              {/* Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as LapTelemetryRecord;
                    return (
                      <div className="bg-[#0E0E16] border border-[#242432] p-3.5 rounded-xl shadow-2xl font-mono text-xs max-w-xs">
                        <div className="flex items-center justify-between border-b border-[#242432] pb-1.5 mb-2">
                          <span className="font-bold text-[#F5F5F7]">LAP {data.lap_number}</span>
                          <span className="text-[#8C8C9A]">{data.fuel_remaining_kg} KG FUEL</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] tabular-nums">
                          <div className="flex justify-between">
                            <span className="text-[#8C8C9A]">Raw Observed Time:</span>
                            <span className="font-bold text-[#F5F5F7]">{data.raw_lap_time.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between text-[#E10600]">
                            <span>Fuel Mass Penalty:</span>
                            <span className="font-bold">+{data.fuel_penalty_s.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between text-[#00E5FF]">
                            <span>Track Evolution:</span>
                            <span className="font-bold">-{data.track_evolution_s.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-[#242432] text-sm">
                            <span className="font-bold text-[#F5F5F7]">Clean Residual:</span>
                            <span className="font-bold text-white">{data.pace_corrected_s.toFixed(3)}s</span>
                          </div>
                          {data.outlier_reason && (
                            <div className="mt-2 pt-1 border-t border-amber-600/40 text-[#D97706] text-[10px]">
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

              {/* Series 1: Raw Lap Time (Muted gray #64748B, thin dotted line) */}
              {showRaw && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="raw_lap_time"
                  name="Raw Lap Time"
                  stroke="#64748B"
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                  dot={{ r: 2.5, fill: '#64748B' }}
                />
              )}

              {/* Series 2: Fuel Mass Correction (Haas Red #E10600, dashed line) */}
              {showFuel && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="fuel_penalty_s"
                  name="Fuel Mass Penalty"
                  stroke="#E10600"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}

              {/* Series 3: Track Evolution Gain (Telemetry Cyan #00E5FF, dashed line) */}
              {showTrackEvo && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={(d: LapTelemetryRecord) => -d.track_evolution_s}
                  name="Track Evolution Gain"
                  stroke="#00E5FF"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {/* Series 4: Decoupled Performance Signal (Solid White #F5F5F7, bold 2.5px stroke) */}
              {showCleaned && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pace_corrected_s"
                  name="Decoupled Signal"
                  stroke="#F5F5F7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#F5F5F7' }}
                  activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#E10600', strokeWidth: 2 }}
                />
              )}

              {/* Filtered Outlier Points on the Graph (Flagged by PIP) */}
              {outliers.map((pt) => (
                <ReferenceDot
                  yAxisId="left"
                  key={pt.lap_number}
                  x={pt.lap_number}
                  y={pt.raw_lap_time}
                  r={6}
                  fill="#D97706"
                  stroke="#0B0B0E"
                  strokeWidth={2}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Filtered Laps & PIP Audit Table */}
      <div className="tgr-card p-5 font-mono">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#242432]">
          <div>
            <h3 className="text-xs font-bold text-[#F5F5F7] tracking-wider">
              FILTERED LAPS & PIP AUDIT TABLE
            </h3>
            <span className="text-[10px] text-[#8C8C9A]">
              7-STAGE DOMAIN SANITIZATION LOG (OBSERVED RAW TIME VS DECOUPLED TRUE SIGNAL)
            </span>
          </div>
          <span className="text-[10px] text-[#8C8C9A]">
            TOTAL STINT LAPS: <strong className="text-[#F5F5F7]">{telemetryData.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#242432] text-[#8C8C9A] text-[10px]">
                <th className="py-2 px-3">LAP</th>
                <th className="py-2 px-3">RAW_TIME</th>
                <th className="py-2 px-3">FUEL_DELTA</th>
                <th className="py-2 px-3">EVO_DELTA</th>
                <th className="py-2 px-3">CLEAN_PACE</th>
                <th className="py-2 px-3 text-right">PIP_FILTER_TAG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242432]/60 tabular-nums">
              {telemetryData.map((d) => {
                const isOutlier = d.is_outlier;
                return (
                  <tr
                    key={d.lap_number}
                    className={`transition-colors ${
                      isOutlier ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-[#181824]'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-[#F5F5F7]">
                      {String(d.lap_number).padStart(2, '0')}
                    </td>
                    <td className="py-2 px-3 text-[#8C8C9A]">{d.raw_lap_time.toFixed(3)}s</td>
                    <td className="py-2 px-3 text-[#E10600]">+{d.fuel_penalty_s.toFixed(3)}s</td>
                    <td className="py-2 px-3 text-[#00E5FF]">-{d.track_evolution_s.toFixed(3)}s</td>
                    <td className="py-2 px-3 font-bold text-[#F5F5F7]">{d.pace_corrected_s.toFixed(3)}s</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getTagBadgeClass(d.pip_filter_tag)}`}>
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
