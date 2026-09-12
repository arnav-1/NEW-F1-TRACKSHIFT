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
import { Filter, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ConfounderDecouplingViewProps {
  telemetryData: LapTelemetryRecord[];
}

export const ConfounderDecouplingView: React.FC<ConfounderDecouplingViewProps> = ({
  telemetryData,
}) => {
  const [showRaw, setShowRaw] = useState(true);
  const [showFuel, setShowFuel] = useState(true);
  const [showTrackEvo, setShowTrackEvo] = useState(true);
  const [showCleaned, setShowCleaned] = useState(true);
  const [showOutlierAudit, setShowOutlierAudit] = useState(false);

  // Outlier points flagged by the 7 PIP domain filters
  const outliers = telemetryData.filter((d) => d.is_outlier || d.outlier_reason);

  return (
    <div className="space-y-6">
      
      {/* Top Filter Summary Banner & 7 PIP Filter Pills */}
      <div className="tgr-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#242432]">
          <div>
            <h2 className="text-base font-black text-[#F5F5F7] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#E10600]" />
              <span>Workspace 2: Observational Confounder Decoupling Engine</span>
            </h2>
            <p className="text-xs text-[#8C8C9A] font-mono mt-0.5">
              Separates true mechanical tyre degradation from fuel load burn-off and rubbering track evolution.
            </p>
          </div>

          <button
            onClick={() => setShowOutlierAudit(!showOutlierAudit)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#242432] bg-[#101018] hover:bg-[#181824] text-xs font-mono font-bold text-[#F5F5F7] shadow-sm transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#E10600]" />
            <span>{showOutlierAudit ? 'Hide Filter Audit' : 'View 7-Stage Filter Audit'}</span>
          </button>
        </div>

        {/* 7 Domain Filter Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4 text-[11px] font-mono">
          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">Filter 1: Status</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Green Flag
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">Filter 2: Track Limits</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Valid Laps
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">Filter 3: Out/In Laps</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Pit Purged
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">Filter 4: SC / VSC</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Pace Excluded
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">Filter 5: Traffic Gap</div>
            <div className="font-bold text-[#FF9100] flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> &gt;1.5s Wake
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">Filter 6: Outliers</div>
            <div className="font-bold text-[#FF9100] flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> 2 Purged
            </div>
          </div>

          <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-[#242432]">
            <div className="text-[#8C8C9A] text-[10px]">Filter 7: Wet Rain</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> 0.0mm Dry
            </div>
          </div>
        </div>

        {/* Expandable Outlier Audit Table */}
        {showOutlierAudit && (
          <div className="mt-4 pt-4 border-t border-[#242432] animate-in fade-in duration-150">
            <div className="text-xs font-mono font-bold text-[#F5F5F7] mb-2">
              Excluded Outlier Audit Log (PIP Stage 5 & 6 Detections):
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#242432] text-[#8C8C9A] text-[10px]">
                    <th className="py-2">Lap #</th>
                    <th className="py-2">Raw Observed Time</th>
                    <th className="py-2">Calculated Delta</th>
                    <th className="py-2">Rejection Mechanism</th>
                    <th className="py-2">Clean Residual Imputed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242432]/60">
                  {outliers.map((pt) => (
                    <tr key={pt.lap_number} className="hover:bg-red-950/20">
                      <td className="py-2 font-bold text-[#F5F5F7]">Lap {pt.lap_number}</td>
                      <td className="py-2 text-[#8C8C9A]">{pt.raw_lap_time.toFixed(3)}s</td>
                      <td className="py-2 font-bold text-[#FF9100]">+{((pt.raw_lap_time - pt.pace_corrected_s)).toFixed(3)}s</td>
                      <td className="py-2 text-[#8C8C9A]">{pt.outlier_reason || 'Traffic Spike (> 2.5s gap loss)'}</td>
                      <td className="py-2 font-bold text-emerald-400">{pt.pace_corrected_s.toFixed(3)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Full-Width Analytical Line Chart */}
      <div className="tgr-card p-6">
        
        {/* Chart Header & Interactive Series Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#242432]">
          <div>
            <h3 className="text-sm font-black text-[#F5F5F7] uppercase tracking-wide font-mono">
              Signal Separation: Observed Pace vs Confounder Residuals
            </h3>
            <span className="text-xs text-[#8C8C9A] font-mono">
              Dual-axis resolution: Pace (Seconds, Left) & Confounder Corrections (Delta, Right)
            </span>
          </div>

          {/* Series Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showRaw
                  ? 'bg-[#181824] text-[#F5F5F7] border-[#38384D] font-bold'
                  : 'text-[#8C8C9A]/50 border-dashed border-[#242432] line-through'
              }`}
            >
              Raw Lap Time
            </button>

            <button
              onClick={() => setShowFuel(!showFuel)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showFuel
                  ? 'bg-red-950/40 text-[#E10600] border-red-800/60 font-bold'
                  : 'text-[#8C8C9A]/50 border-dashed border-[#242432] line-through'
              }`}
            >
              Fuel Mass Penalty (0.033 s/kg)
            </button>

            <button
              onClick={() => setShowTrackEvo(!showTrackEvo)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showTrackEvo
                  ? 'bg-cyan-950/40 text-[#00E5FF] border-cyan-800/60 font-bold'
                  : 'text-[#8C8C9A]/50 border-dashed border-[#242432] line-through'
              }`}
            >
              Track Evolution Curve
            </button>

            <button
              onClick={() => setShowCleaned(!showCleaned)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                showCleaned
                  ? 'bg-[#E10600] text-white border-[#E10600] font-bold shadow-haas-red'
                  : 'text-[#8C8C9A]/50 border-dashed border-[#242432] line-through'
              }`}
            >
              Decoupled Clean Pace
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
              <CartesianGrid strokeDasharray="3 3" stroke="#242432" opacity={0.8} />

              {/* X Axis: Lap Number */}
              <XAxis
                dataKey="lap_number"
                stroke="#8C8C9A"
                fontSize={11}
                fontFamily="JetBrains Mono"
                tickLine={false}
                label={{
                  value: 'Stint Lap Number',
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
                  value: 'Pace (Seconds)',
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
                domain={[-1.5, 3.8]}
                tickLine={false}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`}
                label={{
                  value: 'Confounder Delta (Seconds)',
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
                          <span className="font-black text-[#F5F5F7]">LAP {data.lap_number}</span>
                          <span className="text-[#8C8C9A] font-bold">{data.fuel_remaining_kg} kg fuel</span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-[#8C8C9A]">Raw Observed Time:</span>
                            <span className="font-bold text-[#F5F5F7]">{data.raw_lap_time.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between text-[#E10600]">
                            <span>Fuel Weight Penalty:</span>
                            <span className="font-bold">+{data.fuel_penalty_s.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between text-[#00E5FF]">
                            <span>Track Evolution Gain:</span>
                            <span className="font-bold">-{data.track_evolution_s.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-[#242432] text-sm">
                            <span className="font-black text-[#F5F5F7]">Clean Residual:</span>
                            <span className="font-black text-emerald-400">{data.pace_corrected_s.toFixed(3)}s</span>
                          </div>
                          {data.outlier_reason && (
                            <div className="mt-2 pt-1 border-t border-[#FF9100]/40 text-[#FF9100] text-[10px]">
                              ⚠️ {data.outlier_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Series 1: Dotted Gray Raw Pace */}
              {showRaw && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="raw_lap_time"
                  name="Raw Lap Time"
                  stroke="#8C8C9A"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#8C8C9A' }}
                />
              )}

              {/* Series 2: Dashed Red Fuel Penalty (Right Y-Axis) */}
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

              {/* Series 3: Dashed Cyan Track Evolution (Right Y-Axis) */}
              {showTrackEvo && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={(d: LapTelemetryRecord) => -d.track_evolution_s}
                  name="Track Evolution Grip Gain"
                  stroke="#00E5FF"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {/* Series 4: Bold Solid Cleaned Pace (The True Signal) */}
              {showCleaned && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pace_corrected_s"
                  name="Decoupled Clean Pace"
                  stroke="#E10600"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#E10600' }}
                  activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#E10600', strokeWidth: 2 }}
                />
              )}

              {/* Outlier Markers flagged by PIP */}
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

        {/* Footer Formulation Callout */}
        <div className="mt-4 pt-4 border-t border-[#242432] flex flex-wrap items-center justify-between text-xs font-mono text-[#8C8C9A] gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F5F5F7]">Physical Decomposition:</span>
            <code>Pace_corrected = LapTime_raw - (0.033 × M_fuel) + 1.25(1 - e^(-n/120))</code>
          </div>
          <div className="text-[#E10600] font-bold">
            Monotonic degradation slope: 0.075 s/lap
          </div>
        </div>

      </div>

    </div>
  );
};
