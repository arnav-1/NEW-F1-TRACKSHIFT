import React from 'react';
import type { TyreCornerMetrics, LapTelemetryRecord, WheelId } from '../types/telemetry';
import { useTelemetry } from '../context/TelemetryContext';
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
import {
  TelemetryReadoutTooltip,
  computeWearDomain,
  TELEMETRY_THEME,
} from './shared/TelemetryChartComponents';

interface FourWheelDynamicsViewProps {
  corners: Record<'FL' | 'FR' | 'RL' | 'RR', TyreCornerMetrics>;
  telemetryData: LapTelemetryRecord[];
}

export const FourWheelDynamicsView: React.FC<FourWheelDynamicsViewProps> = ({
  corners,
  telemetryData,
}) => {
  const {
    selectedWheel,
    setSelectedWheel,
    activeCircuitInfo,
    compoundMetadata,
    currentLap,
  } = useTelemetry();

  const limitingCorner = activeCircuitInfo.limiting_wheel || 'FL';

  // Compute wear decomposition for the selected wheel ('FL', 'FR', 'RL', 'RR', or 'ALL')
  const wearData = telemetryData.map((d) => {
    if (selectedWheel === 'ALL') {
      const fl = d.corners.FL;
      const fr = d.corners.FR;
      const rl = d.corners.RL;
      const rr = d.corners.RR;
      const avgAbrasion = (fl.abrasion_rate + fr.abrasion_rate + rl.abrasion_rate + rr.abrasion_rate) / 4;
      const avgGraining = (fl.graining_rate + fr.graining_rate + rl.graining_rate + rr.graining_rate) / 4;
      const avgBlistering = (fl.blistering_rate + fr.blistering_rate + rl.blistering_rate + rr.blistering_rate) / 4;
      const avgCum = (fl.cumulative_damage + fr.cumulative_damage + rl.cumulative_damage + rr.cumulative_damage) / 4;
      return {
        lap_number: d.lap_number,
        abrasion: Number((avgAbrasion * 10000).toFixed(2)),
        graining: Number((avgGraining * 10000).toFixed(2)),
        blistering: Number((avgBlistering * 10000).toFixed(2)),
        total_damage: Number(((avgAbrasion + avgGraining + avgBlistering) * 10000).toFixed(2)),
        cumulative_damage: avgCum,
      };
    }

    const wheelData = d.corners[selectedWheel as 'FL' | 'FR' | 'RL' | 'RR'] || d.corners.FL;
    return {
      lap_number: d.lap_number,
      abrasion: Number((wheelData.abrasion_rate * 10000).toFixed(2)),
      graining: Number((wheelData.graining_rate * 10000).toFixed(2)),
      blistering: Number((wheelData.blistering_rate * 10000).toFixed(2)),
      total_damage: Number(((wheelData.abrasion_rate + wheelData.graining_rate + wheelData.blistering_rate) * 10000).toFixed(2)),
      cumulative_damage: wheelData.cumulative_damage,
    };
  });

  const cliffLap = Math.round(compoundMetadata.predicted_cliff_lap || 19);

  // Dynamic engineering axis domain for wear rates
  const totalDamages = wearData.map((d) => d.abrasion + d.graining + d.blistering);
  const wearDomain = computeWearDomain(totalDamages, 0.2);

  const wheelOptions: Array<{ id: WheelId; label: string; isLimiting?: boolean }> = [
    { id: 'FL', label: 'FL (Front-Left)', isLimiting: limitingCorner === 'FL' },
    { id: 'FR', label: 'FR (Front-Right)', isLimiting: limitingCorner === 'FR' },
    { id: 'RL', label: 'RL (Rear-Left)', isLimiting: limitingCorner === 'RL' },
    { id: 'RR', label: 'RR (Rear-Right)', isLimiting: limitingCorner === 'RR' },
    { id: 'ALL', label: 'CHASSIS ALL (Mean)' },
  ];

  const renderCornerCard = (cornerKey: 'FL' | 'FR' | 'RL' | 'RR', positionName: string) => {
    const corner = corners[cornerKey] || {
      corner: cornerKey,
      workload_share: 0.25,
      tread_temp_c: 102.0,
      carcass_temp_c: 98.0,
      abrasion_rate: 0.00015,
      graining_rate: 0.0,
      blistering_rate: 0.0,
      cumulative_damage: 0.15,
      is_limiting: cornerKey === limitingCorner,
      status: 'OPTIMAL',
    };

    const isLimiting = cornerKey === limitingCorner;
    const isSelected = selectedWheel === cornerKey;

    let status = 'Optimal Window';
    let statusClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';

    if (corner.tread_temp_c > 118) {
      status = 'Thermal Blistering';
      statusClass = 'text-red-400 bg-red-950/40 border-red-800/40 font-semibold';
    } else if (corner.tread_temp_c < 85) {
      status = 'Cold Graining';
      statusClass = 'text-amber-400 bg-amber-950/40 border-amber-800/40 font-semibold';
    } else if (isLimiting) {
      status = 'Limiting Corner';
      statusClass = 'text-red-300 bg-red-950/50 border-red-800/50 font-semibold';
    }

    const treadPct = Math.min(100, Math.max(10, Math.round(((corner.tread_temp_c - 60) / 70) * 100)));
    const carcassPct = Math.min(100, Math.max(10, Math.round(((corner.carcass_temp_c - 60) / 70) * 100)));

    return (
      <div
        onClick={() => setSelectedWheel(cornerKey)}
        className={`f1-card p-4 relative font-sans transition-all cursor-pointer ${
          isSelected
            ? 'ring-2 ring-[#E10600] border-red-800/70 bg-[#171A22]'
            : isLimiting
            ? 'border-red-900/60 bg-gradient-to-br from-[#16181D] via-[#1E1619] to-[#251418] shadow-[0_4px_24px_rgba(225,6,0,0.15)] hover:border-red-600/60'
            : 'hover:border-white/[0.20]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-7 h-7 rounded-full text-xs font-bold font-display flex items-center justify-center transition-all ${
                isLimiting
                  ? 'bg-[#E10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.6)]'
                  : isSelected
                  ? 'bg-red-900/80 text-white border border-red-500'
                  : 'bg-white/[0.06] text-zinc-300 border border-white/[0.1]'
              }`}
            >
              {cornerKey}
            </span>
            <div>
              <div className="f1-display text-xs tracking-wider text-white font-bold flex items-center gap-1.5">
                <span>{positionName}</span>
                {isSelected && (
                  <span className="text-[9px] bg-red-600/30 text-red-400 px-1.5 py-0.2 rounded font-mono">
                    ACTIVE CHART
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 font-sans">
                Node {cornerKey} Telemetry
              </div>
            </div>
          </div>

          {isLimiting ? (
            <span className="f1-pill text-[9px] bg-red-950/60 text-red-300 border border-red-800/50 px-2.5 py-0.5 rounded-full font-bold">
              Limiting ({cornerKey})
            </span>
          ) : (
            <span className={`f1-pill text-[9px] px-2.5 py-0.5 rounded-full border font-bold ${statusClass}`}>
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
              <span className="text-zinc-100 font-mono font-semibold tabular-nums">
                {corner.tread_temp_c.toFixed(1)} °C [{treadPct}%]
              </span>
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
              <span className="text-zinc-100 font-mono font-semibold tabular-nums">
                {corner.carcass_temp_c.toFixed(1)} °C [{carcassPct}%]
              </span>
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
            <span>Thermal Window:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusClass}`}>
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
          {renderCornerCard('FL', 'Front-Left (FL)')}
          {renderCornerCard('RL', 'Rear-Left (RL)')}
        </div>

        {/* Center: Titanium Vector Chassis Model */}
        <div className="xl:col-span-4 tgr-card p-5 flex flex-col items-center justify-center relative min-h-[380px]">
          
          <div className="text-center mb-3">
            <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.07] tracking-wider uppercase">
              VF-24 4-Corner Physical Telemetry (Lap {currentLap})
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
            <rect
              x="10" y="55" width="20" height="42" rx="3"
              fill={selectedWheel === 'FL' ? '#1F1214' : '#0A0C0F'}
              stroke={limitingCorner === 'FL' ? '#E10600' : '#4B5563'}
              strokeWidth={limitingCorner === 'FL' ? '2.2' : '1.5'}
            />
            <text x="14" y="80" fill={limitingCorner === 'FL' ? '#E10600' : '#D1D5DB'} fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">FL</text>
            
            <rect
              x="130" y="55" width="20" height="42" rx="3"
              fill={selectedWheel === 'FR' ? '#1F1214' : '#0A0C0F'}
              stroke={limitingCorner === 'FR' ? '#E10600' : '#4B5563'}
              strokeWidth={limitingCorner === 'FR' ? '2.2' : '1.5'}
            />
            <text x="134" y="80" fill={limitingCorner === 'FR' ? '#E10600' : '#9CA3AF'} fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">FR</text>

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
            <rect
              x="8" y="218" width="24" height="46" rx="3"
              fill={selectedWheel === 'RL' ? '#1F1214' : '#0A0C0F'}
              stroke={limitingCorner === 'RL' ? '#E10600' : '#38BDF8'}
              strokeWidth={limitingCorner === 'RL' ? '2.2' : '1.8'}
            />
            <text x="13" y="246" fill={limitingCorner === 'RL' ? '#E10600' : '#38BDF8'} fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">RL</text>
            
            <rect
              x="128" y="218" width="24" height="46" rx="3"
              fill={selectedWheel === 'RR' ? '#1F1214' : '#0A0C0F'}
              stroke={limitingCorner === 'RR' ? '#E10600' : '#4B5563'}
              strokeWidth={limitingCorner === 'RR' ? '2.2' : '1.5'}
            />
            <text x="133" y="246" fill={limitingCorner === 'RR' ? '#E10600' : '#9CA3AF'} fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">RR</text>

            {/* Rear Wing */}
            <rect x="28" y="265" width="104" height="18" rx="2" fill="#0B0D11" stroke="#E10600" strokeWidth="1.5" />
            <line x1="28" y1="274" x2="132" y2="274" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 2" />
          </svg>

          {/* Dynamic Weight Transfer Readouts */}
          <div className="w-full mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-md bg-[#0A0C0F] border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">Pitch Bias (Brake)</span>
              <span className="font-semibold text-sky-400 font-mono tabular-nums">
                {activeCircuitInfo.id === 'austria' ? '74% Heavy Front' : '68% Front Axle'}
              </span>
            </div>
            <div className="p-2 rounded-md bg-[#0A0C0F] border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">Limiting Axle Bias</span>
              <span className="font-semibold text-red-400 font-mono tabular-nums">
                {activeCircuitInfo.id === 'austria' ? 'Rear Traction Drive' : '88% Outer Left Lateral'}
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: FR & RR Cards */}
        <div className="xl:col-span-4 space-y-4">
          {renderCornerCard('FR', 'Front-Right (FR)')}
          {renderCornerCard('RR', 'Rear-Right (RR)')}
        </div>

      </div>

      {/* Tri-Mechanism Wear Stacked Area Chart */}
      <div className="f1-card p-5">
        
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="f1-display text-sm tracking-wide text-white font-bold">
                Tri-Mechanism Wear Superposition [D(t)]
              </h3>
              <span className="text-xs font-mono font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
                {selectedWheel === 'ALL' ? 'CHASSIS ALL' : `TYRE: ${selectedWheel}`}
              </span>
            </div>
            <span className="text-xs text-zinc-400 font-sans">
              Cumulative damage rate breakdown (Abrasion + Graining + Blistering) across stint laps
            </span>
          </div>

          {/* Corner Selector Pills for the Chart */}
          <div className="flex items-center gap-1.5 bg-[#0A0C0F] border border-white/[0.08] p-1 rounded-lg">
            {wheelOptions.map((opt) => {
              const isCurrent = selectedWheel === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedWheel(opt.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-display uppercase tracking-wider transition-all font-bold ${
                    isCurrent
                      ? 'bg-[#E10600] text-white shadow-[0_0_8px_rgba(225,6,0,0.5)]'
                      : opt.isLimiting
                      ? 'text-red-300 hover:text-white bg-red-950/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {opt.id} {opt.isLimiting ? '★' : ''}
                </button>
              );
            })}
          </div>

          {/* Legend Badges */}
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-300 font-sans">
              <span className="w-2 h-2 rounded-full bg-[#94A3B8]"></span>
              <span>Mechanical Abrasion</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-300 font-sans">
              <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
              <span>Cold Graining (&lt;85°C)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-300 font-sans">
              <span className="w-2 h-2 rounded-full bg-[#E10600]"></span>
              <span>Thermal Blistering (&gt;118°C)</span>
            </span>
          </div>
        </div>

        {/* High-Density Recharts Stacked Area Canvas */}
        <div className="w-full h-[320px] bg-[#080A0E] rounded-lg border border-white/[0.08] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={wearData} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="gradAbrasionF1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="gradGrainingF1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="gradBlisteringF1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray={TELEMETRY_THEME.gridDash}
                stroke={TELEMETRY_THEME.gridColor}
              />

              <XAxis
                dataKey="lap_number"
                stroke={TELEMETRY_THEME.axisLineColor}
                tick={{ fill: TELEMETRY_THEME.tickColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
                axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
                label={{
                  value: 'LAP NUMBER',
                  position: 'insideBottom',
                  offset: -4,
                  fill: TELEMETRY_THEME.tickColor,
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.08em',
                }}
              />

              <YAxis
                stroke={TELEMETRY_THEME.axisLineColor}
                domain={wearDomain}
                tick={{ fill: TELEMETRY_THEME.tickColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
                axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
                tickFormatter={(v) => `${v.toFixed(1)}`}
                label={{
                  value: 'D_rate [x10⁻⁴/lap]',
                  angle: -90,
                  position: 'insideLeft',
                  fill: TELEMETRY_THEME.tickColor,
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  offset: 8,
                }}
              />

              <Tooltip
                cursor={{ stroke: TELEMETRY_THEME.cursorLineColor, strokeWidth: 1, strokeDasharray: '2 2' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <TelemetryReadoutTooltip
                        active={active}
                        title={`LAP ${d.lap_number} WEAR DECOMPOSITION [${selectedWheel}]`}
                        subtitle={`Cumulative Damage D(t): ${d.cumulative_damage.toFixed(3)}`}
                        items={[
                          { channel: 'MECHANICAL ABRASION', value: d.abrasion, unit: 'x10⁻⁴', color: '#94A3B8' },
                          { channel: 'COLD GRAINING', value: d.graining, unit: 'x10⁻⁴', color: '#F59E0B' },
                          { channel: 'THERMAL BLISTERING', value: d.blistering, unit: 'x10⁻⁴', color: '#EF4444' },
                          { channel: 'TOTAL WEAR RATE', value: d.total_damage, unit: 'x10⁻⁴', color: '#FFFFFF', isProminent: true },
                        ]}
                        alertMessage={d.lap_number >= cliffLap ? `CLIFF HORIZON REACHED (Lap ${cliffLap})` : undefined}
                        alertType={d.lap_number >= cliffLap ? 'critical' : 'info'}
                      />
                    );
                  }
                  return null;
                }}
              />

              {/* Stacked Areas with translucent technical fills and razor 1.2px borders */}
              <Area
                type="monotone"
                dataKey="abrasion"
                stackId="1"
                stroke="#CBD5E1"
                strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                fill="url(#gradAbrasionF1)"
                name="Mechanical Abrasion"
              />
              <Area
                type="monotone"
                dataKey="graining"
                stackId="1"
                stroke="#FBBF24"
                strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                fill="url(#gradGrainingF1)"
                name="Cold Graining"
              />
              <Area
                type="monotone"
                dataKey="blistering"
                stackId="1"
                stroke="#F87171"
                strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                fill="url(#gradBlisteringF1)"
                name="Thermal Blistering"
              />

              {/* Analytical Stint Cliff Marker */}
              <ReferenceLine
                x={cliffLap}
                stroke={TELEMETRY_THEME.channels.haasRed}
                strokeDasharray="3 2"
                strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
                label={{
                  value: `CLIFF HORIZON: LAP ${cliffLap}`,
                  position: 'top',
                  fill: TELEMETRY_THEME.channels.haasRed,
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
};
