import React from 'react';
import type { TyreCornerMetrics, LapTelemetryRecord } from '../types/telemetry';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface FourWheelDynamicsViewProps {
  corners: Record<'FL' | 'FR' | 'RL' | 'RR', TyreCornerMetrics>;
  telemetryData: LapTelemetryRecord[];
}

export const FourWheelDynamicsView: React.FC<FourWheelDynamicsViewProps> = ({
  corners,
  telemetryData,
}) => {
  // Wear decomposition data for stacked area chart
  const wearData = telemetryData.map((d) => {
    const fl = d.corners.FL;
    return {
      lap_number: d.lap_number,
      abrasion: Number((fl.abrasion_rate * 10000).toFixed(2)),
      graining: Number((fl.graining_rate * 10000).toFixed(2)),
      blistering: Number((fl.blistering_rate * 10000).toFixed(2)),
      total_damage: Number(((fl.abrasion_rate + fl.graining_rate + fl.blistering_rate) * 10000).toFixed(2)),
      cumulative_damage: fl.cumulative_damage,
    };
  });

  const cliffLap = 19;

  const renderCornerCard = (cornerKey: 'FL' | 'FR' | 'RL' | 'RR', positionName: string) => {
    const corner = corners[cornerKey];
    const isLimiting = cornerKey === 'FL';

    let status = 'Optimal Window';
    let statusClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';

    if (isLimiting || corner.tread_temp_c > 118) {
      status = 'Overheating';
      statusClass = 'text-red-400 bg-red-950/40 border-red-800/40 font-semibold';
    } else if (corner.tread_temp_c < 85) {
      status = 'Graining Risk';
      statusClass = 'text-amber-400 bg-amber-950/40 border-amber-800/40 font-semibold';
    }

    const treadPct = Math.min(100, Math.max(10, Math.round(((corner.tread_temp_c - 70) / 60) * 100)));
    const carcassPct = Math.min(100, Math.max(10, Math.round(((corner.carcass_temp_c - 70) / 60) * 100)));

    return (
      <div
        className={`tgr-card p-4 relative font-sans transition-colors ${
          isLimiting
            ? 'border-rose-900/40 bg-gradient-to-br from-[#14171F] to-[#1A1216]'
            : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md text-xs font-bold font-mono flex items-center justify-center ${
                isLimiting
                  ? 'bg-red-500/10 text-red-400 border border-red-500/25'
                  : 'bg-white/[0.04] text-zinc-400 border border-white/[0.08]'
              }`}
            >
              {cornerKey}
            </span>
            <div>
              <div className="text-xs font-semibold text-zinc-100">
                {positionName}
              </div>
              <div className="text-[10px] text-zinc-400">
                Node {cornerKey} Telemetry
              </div>
            </div>
          </div>

          {isLimiting ? (
            <span className="text-[9px] bg-red-950/50 text-red-300 border border-red-800/40 px-2 py-0.5 rounded-full font-semibold">
              Limiting Tyre (FL)
            </span>
          ) : (
            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${statusClass}`}>
              {status}
            </span>
          )}
        </div>

        {/* Structured Metrics */}
        <div className="space-y-2.5 text-xs">
          
          {/* Tread Temp */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1 text-[11px]">
              <span>Tread Temp:</span>
              <span className="text-zinc-100 font-mono font-semibold tabular-nums">{corner.tread_temp_c.toFixed(1)} °C [{treadPct}%]</span>
            </div>
            <div className="w-full bg-[#0A0C0F] h-1.5 rounded-full overflow-hidden border border-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all ${
                  corner.tread_temp_c > 118 ? 'bg-red-500' : corner.tread_temp_c < 85 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${treadPct}%` }}
              ></div>
            </div>
          </div>

          {/* Carcass Temp */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1 text-[11px]">
              <span>Carcass Temp:</span>
              <span className="text-zinc-100 font-mono font-semibold tabular-nums">{corner.carcass_temp_c.toFixed(1)} °C [{carcassPct}%]</span>
            </div>
            <div className="w-full bg-[#0A0C0F] h-1.5 rounded-full overflow-hidden border border-white/[0.06]">
              <div
                className="h-full bg-sky-400 rounded-full transition-all"
                style={{ width: `${carcassPct}%` }}
              ></div>
            </div>
          </div>

          {/* Key Readings */}
          <div className="pt-2.5 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-zinc-500 block text-[10px]">Workload Share:</span>
              <span className={`font-semibold font-mono tabular-nums ${isLimiting ? 'text-red-400' : 'text-zinc-200'}`}>
                {(corner.workload_share * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Wear State:</span>
              <span className="text-zinc-200 font-mono font-semibold tabular-nums">
                {corner.cumulative_damage.toFixed(3)}
              </span>
            </div>
          </div>

          <div className="pt-1.5 flex justify-between items-center text-[11px] text-zinc-400">
            <span>Status:</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] border ${statusClass}`}>
              {status}
            </span>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 font-sans">
      
      {/* 4-Wheel Contact Patch Matrix Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        
        {/* Left Column: FL & RL Cards */}
        <div className="xl:col-span-4 space-y-4">
          {renderCornerCard('FL', 'Front-Left (Outer Lim)')}
          {renderCornerCard('RL', 'Rear-Left (Drive Out)')}
        </div>

        {/* Center: Titanium Vector Chassis Model */}
        <div className="xl:col-span-4 tgr-card p-5 flex flex-col items-center justify-center relative min-h-[380px]">
          
          <div className="text-center mb-3">
            <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.07] tracking-wider uppercase">
              VF-26 Contact Patch Dynamics
            </span>
          </div>

          {/* Top-Down Vector Outline */}
          <svg
            viewBox="0 0 160 300"
            className="w-full h-full max-h-[260px] drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Front Wing */}
            <path d="M 18 40 Q 80 25 142 40 L 144 50 Q 80 35 16 50 Z" fill="#0B0D11" stroke="#E10600" strokeWidth="1.5" />
            <rect x="15" y="32" width="6" height="22" rx="1" fill="#E10600" />
            <rect x="139" y="32" width="6" height="22" rx="1" fill="#E10600" />

            {/* Nose Cone */}
            <path d="M 72 40 L 88 40 L 85 105 L 75 105 Z" fill="#1A1D26" stroke="#6B7280" strokeWidth="1.2" />
            <line x1="80" y1="40" x2="80" y2="85" stroke="#E10600" strokeWidth="2" />

            {/* Front Suspension Pushrods */}
            <line x1="28" y1="75" x2="74" y2="92" stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="132" y1="75" x2="86" y2="92" stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 2" />

            {/* Front Tyres */}
            <rect x="10" y="55" width="20" height="42" rx="3" fill="#0A0C0F" stroke="#E10600" strokeWidth="2" />
            <text x="14" y="80" fill="#E10600" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">FL</text>
            <rect x="130" y="55" width="20" height="42" rx="3" fill="#0A0C0F" stroke="#374151" strokeWidth="1.5" />
            <text x="134" y="80" fill="#9CA3AF" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">FR</text>

            {/* Monocoque Body & Cockpit */}
            <path d="M 68 105 L 92 105 L 96 175 L 64 175 Z" fill="#12151C" stroke="#4B5563" strokeWidth="1" />
            <path d="M 74 125 C 74 115, 86 115, 86 125 L 83 148 L 77 148 Z" fill="#20242E" stroke="#E10600" strokeWidth="1.2" />
            <circle cx="80" cy="138" r="4.5" fill="#E10600" stroke="#FFFFFF" strokeWidth="1" />

            {/* Sidepods */}
            <path d="M 68 135 L 42 155 L 46 205 L 68 200 Z" fill="#12151C" stroke="#262B36" strokeWidth="1" />
            <path d="M 92 135 L 118 155 L 114 205 L 92 200 Z" fill="#12151C" stroke="#262B36" strokeWidth="1" />
            <line x1="45" y1="165" x2="48" y2="200" stroke="#E10600" strokeWidth="2" />
            <line x1="115" y1="165" x2="112" y2="200" stroke="#E10600" strokeWidth="1.2" opacity="0.6" />

            {/* Engine Spine */}
            <line x1="80" y1="165" x2="80" y2="235" stroke="#9CA3AF" strokeWidth="1.5" />
            <line x1="80" y1="175" x2="80" y2="230" stroke="#E10600" strokeWidth="2" />

            {/* Rear Suspension */}
            <line x1="28" y1="240" x2="75" y2="240" stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="132" y1="240" x2="85" y2="240" stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 2" />

            {/* Rear Tyres */}
            <rect x="8" y="218" width="24" height="46" rx="3" fill="#0A0C0F" stroke="#38BDF8" strokeWidth="1.8" />
            <text x="13" y="246" fill="#38BDF8" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">RL</text>
            <rect x="128" y="218" width="24" height="46" rx="3" fill="#0A0C0F" stroke="#374151" strokeWidth="1.5" />
            <text x="133" y="246" fill="#9CA3AF" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">RR</text>

            {/* Rear Wing */}
            <rect x="28" y="265" width="104" height="18" rx="2" fill="#0B0D11" stroke="#E10600" strokeWidth="1.5" />
            <line x1="28" y1="274" x2="132" y2="274" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 2" />
          </svg>

          {/* Dynamic Weight Transfer Readouts */}
          <div className="w-full mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-md bg-[#0A0C0F] border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">Pitch Bias (Brake)</span>
              <span className="font-semibold text-sky-400 font-mono tabular-nums">70% Front Axle</span>
            </div>
            <div className="p-2 rounded-md bg-[#0A0C0F] border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">Roll Bias (T3 / T9)</span>
              <span className="font-semibold text-red-400 font-mono tabular-nums">88% Outer Left</span>
            </div>
          </div>

        </div>

        {/* Right Column: FR & RR Cards */}
        <div className="xl:col-span-4 space-y-4">
          {renderCornerCard('FR', 'Front-Right (Inner Unload)')}
          {renderCornerCard('RR', 'Rear-Right (Drive In)')}
        </div>

      </div>

      {/* Tri-Mechanism Wear Stacked Area Chart */}
      <div className="tgr-card p-5">
        
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Tri-Mechanism Wear Superposition [D(t)]
            </h3>
            <span className="text-xs text-zinc-400">
              Cumulative damage breakdown across stint laps
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#94A3B8]"></span>
              <span>Mechanical Abrasion</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]"></span>
              <span>Cold Graining (&lt;85°C)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]"></span>
              <span>Thermal Blistering (&gt;118°C)</span>
            </span>
          </div>
        </div>

        {/* Recharts Stacked Area Canvas */}
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={wearData} margin={{ top: 10, right: 25, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

              <XAxis
                dataKey="lap_number"
                stroke="#6B7280"
                fontSize={10}
                fontFamily="Inter, sans-serif"
                tickLine={false}
                label={{
                  value: 'Stint Lap Number',
                  position: 'insideBottom',
                  offset: -4,
                  fill: '#9CA3AF',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                }}
              />

              <YAxis
                stroke="#6B7280"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                tickLine={false}
                label={{
                  value: 'Damage Rate (x10⁻⁴/lap)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  offset: 5,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#12151C] border border-white/[0.1] p-3 rounded-lg shadow-xl text-xs max-w-xs">
                        <div className="font-semibold text-zinc-100 border-b border-white/[0.08] pb-1 mb-2 font-mono">
                          Lap {d.lap_number} Damage Breakdown
                        </div>
                        <div className="space-y-1 text-[11px] font-mono tabular-nums">
                          <div className="flex justify-between text-slate-300">
                            <span className="font-sans">Abrasion:</span>
                            <span className="font-semibold">+{d.abrasion}</span>
                          </div>
                          <div className="flex justify-between text-amber-400">
                            <span className="font-sans">Graining:</span>
                            <span className="font-semibold">+{d.graining}</span>
                          </div>
                          <div className="flex justify-between text-red-400">
                            <span className="font-sans">Blistering:</span>
                            <span className="font-semibold">+{d.blistering}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-white/[0.08] font-bold text-white">
                            <span className="font-sans">Damage State:</span>
                            <span>{d.cumulative_damage.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Stacked Areas */}
              <Area
                type="monotone"
                dataKey="abrasion"
                stackId="1"
                stroke="#94A3B8"
                fill="#94A3B8"
                fillOpacity={0.7}
                name="Mechanical Abrasion"
              />
              <Area
                type="monotone"
                dataKey="graining"
                stackId="1"
                stroke="#D97706"
                fill="#D97706"
                fillOpacity={0.7}
                name="Cold Graining"
              />
              <Area
                type="monotone"
                dataKey="blistering"
                stackId="1"
                stroke="#DC2626"
                fill="#DC2626"
                fillOpacity={0.7}
                name="Thermal Blistering"
              />

              {/* Analytical Stint Cliff Marker */}
              <ReferenceLine
                x={cliffLap}
                stroke="#EF4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Cliff Inflection: Lap ${cliffLap}`,
                  position: 'top',
                  fill: '#EF4444',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
};
