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

    let status = 'OPTIMAL_WINDOW';
    let statusClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';

    if (isLimiting || corner.tread_temp_c > 118) {
      status = 'OVERHEATING';
      statusClass = 'text-[#E10600] bg-red-950/40 border-red-800/40 font-bold';
    } else if (corner.tread_temp_c < 85) {
      status = 'GRAINING_RISK';
      statusClass = 'text-[#D97706] bg-amber-950/40 border-amber-800/40 font-bold';
    }

    const treadPct = Math.min(100, Math.max(10, Math.round(((corner.tread_temp_c - 70) / 60) * 100)));
    const carcassPct = Math.min(100, Math.max(10, Math.round(((corner.carcass_temp_c - 70) / 60) * 100)));

    return (
      <div
        className={`tgr-card p-4 relative font-mono transition-colors ${
          isLimiting
            ? 'border border-[#E10600] bg-[#171216]'
            : 'border border-[#242432]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#242432]">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center ${
                isLimiting
                  ? 'bg-[#E10600] text-white'
                  : 'bg-[#181824] text-[#8C8C9A] border border-[#242432]'
              }`}
            >
              {cornerKey}
            </span>
            <div>
              <div className="text-xs font-bold text-[#F5F5F7]">
                {positionName}
              </div>
              <div className="text-[10px] text-[#8C8C9A]">
                NODE {cornerKey} // TELEMETRY
              </div>
            </div>
          </div>

          {isLimiting ? (
            <span className="text-[9px] bg-[#E10600] text-white px-2 py-0.5 rounded font-bold tracking-wider">
              LIMITING TYRE (FL)
            </span>
          ) : (
            <span className={`text-[9px] px-2 py-0.5 rounded border ${statusClass}`}>
              {status}
            </span>
          )}
        </div>

        {/* Structured Metrics */}
        <div className="space-y-2 text-xs tabular-nums">
          
          {/* Tread Temp */}
          <div>
            <div className="flex justify-between text-[#8C8C9A] mb-1">
              <span>TREAD_TEMP:</span>
              <span className="text-[#F5F5F7] font-bold">{corner.tread_temp_c.toFixed(1)} °C [{treadPct}%]</span>
            </div>
            <div className="w-full bg-[#0B0B0E] h-1.5 rounded-full overflow-hidden border border-[#242432]">
              <div
                className={`h-full rounded-full ${
                  corner.tread_temp_c > 118 ? 'bg-[#E10600]' : corner.tread_temp_c < 85 ? 'bg-[#D97706]' : 'bg-emerald-400'
                }`}
                style={{ width: `${treadPct}%` }}
              ></div>
            </div>
          </div>

          {/* Carcass Temp */}
          <div>
            <div className="flex justify-between text-[#8C8C9A] mb-1">
              <span>CARCASS_TEMP:</span>
              <span className="text-[#F5F5F7] font-bold">{corner.carcass_temp_c.toFixed(1)} °C [{carcassPct}%]</span>
            </div>
            <div className="w-full bg-[#0B0B0E] h-1.5 rounded-full overflow-hidden border border-[#242432]">
              <div
                className="h-full bg-[#00E5FF] rounded-full"
                style={{ width: `${carcassPct}%` }}
              ></div>
            </div>
          </div>

          {/* Key Readings */}
          <div className="pt-2 border-t border-[#242432] grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[#8C8C9A] block text-[10px]">ENERGY_SHARE:</span>
              <span className={`font-bold ${isLimiting ? 'text-[#E10600]' : 'text-[#F5F5F7]'}`}>
                {(corner.workload_share * 100).toFixed(1)} %
              </span>
            </div>
            <div>
              <span className="text-[#8C8C9A] block text-[10px]">WEAR_STATE:</span>
              <span className="text-[#F5F5F7] font-bold">
                {corner.cumulative_damage.toFixed(3)}
              </span>
            </div>
          </div>

          <div className="pt-1.5 flex justify-between items-center text-[10px] text-[#8C8C9A]">
            <span>STATUS:</span>
            <span className={`px-1.5 py-0.2 rounded border ${statusClass}`}>
              {status}
            </span>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 4-Wheel Contact Patch Matrix Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        
        {/* Left Column: FL & RL Cards */}
        <div className="xl:col-span-4 space-y-4">
          {renderCornerCard('FL', 'FRONT-LEFT (OUTER LIM)')}
          {renderCornerCard('RL', 'REAR-LEFT (DRIVE OUT)')}
        </div>

        {/* Center: Titanium Vector Chassis Model */}
        <div className="xl:col-span-4 tgr-card p-6 flex flex-col items-center justify-center relative bg-[#15151E] min-h-[380px] border border-[#242432]">
          
          <div className="text-center mb-3">
            <span className="text-[10px] font-mono font-bold text-[#8C8C9A] bg-[#0B0B0E] px-3 py-1 rounded-full border border-[#242432] tracking-wider">
              VF-26 CONTACT PATCH DYNAMICS
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
            <path d="M 18 40 Q 80 25 142 40 L 144 50 Q 80 35 16 50 Z" fill="#0B0B0E" stroke="#E10600" strokeWidth="1.5" />
            <rect x="15" y="32" width="6" height="22" rx="1" fill="#E10600" />
            <rect x="139" y="32" width="6" height="22" rx="1" fill="#E10600" />

            {/* Nose Cone */}
            <path d="M 72 40 L 88 40 L 85 105 L 75 105 Z" fill="#1C1C28" stroke="#8C8C9A" strokeWidth="1.5" />
            <line x1="80" y1="40" x2="80" y2="85" stroke="#E10600" strokeWidth="2.5" />

            {/* Front Suspension Pushrods */}
            <line x1="28" y1="75" x2="74" y2="92" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="132" y1="75" x2="86" y2="92" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Front Tyres */}
            <rect x="10" y="55" width="20" height="42" rx="3" fill="#0B0B0E" stroke="#E10600" strokeWidth="2.5" />
            <text x="14" y="80" fill="#E10600" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">FL</text>
            <rect x="130" y="55" width="20" height="42" rx="3" fill="#0B0B0E" stroke="#333345" strokeWidth="1.5" />
            <text x="134" y="80" fill="#8C8C9A" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">FR</text>

            {/* Monocoque Body & Cockpit */}
            <path d="M 68 105 L 92 105 L 96 175 L 64 175 Z" fill="#0E0E16" stroke="#8C8C9A" strokeWidth="1.2" />
            <path d="M 74 125 C 74 115, 86 115, 86 125 L 83 148 L 77 148 Z" fill="#242432" stroke="#E10600" strokeWidth="1.5" />
            <circle cx="80" cy="138" r="5" fill="#E10600" stroke="#FFFFFF" strokeWidth="1" />

            {/* Sidepods */}
            <path d="M 68 135 L 42 155 L 46 205 L 68 200 Z" fill="#0E0E16" stroke="#242432" strokeWidth="1.2" />
            <path d="M 92 135 L 118 155 L 114 205 L 92 200 Z" fill="#0E0E16" stroke="#242432" strokeWidth="1.2" />
            <line x1="45" y1="165" x2="48" y2="200" stroke="#E10600" strokeWidth="2.5" />
            <line x1="115" y1="165" x2="112" y2="200" stroke="#E10600" strokeWidth="1.5" opacity="0.6" />

            {/* Engine Spine */}
            <line x1="80" y1="165" x2="80" y2="235" stroke="#F5F5F7" strokeWidth="2" />
            <line x1="80" y1="175" x2="80" y2="230" stroke="#E10600" strokeWidth="2.5" />

            {/* Rear Suspension */}
            <line x1="28" y1="240" x2="75" y2="240" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="132" y1="240" x2="85" y2="240" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Rear Tyres */}
            <rect x="8" y="218" width="24" height="46" rx="3" fill="#0B0B0E" stroke="#00E5FF" strokeWidth="2" />
            <text x="13" y="246" fill="#00E5FF" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">RL</text>
            <rect x="128" y="218" width="24" height="46" rx="3" fill="#0B0B0E" stroke="#333345" strokeWidth="1.5" />
            <text x="133" y="246" fill="#8C8C9A" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">RR</text>

            {/* Rear Wing */}
            <rect x="28" y="265" width="104" height="18" rx="2" fill="#0B0B0E" stroke="#E10600" strokeWidth="1.5" />
            <line x1="28" y1="274" x2="132" y2="274" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 2" />
          </svg>

          {/* Dynamic Weight Transfer Readouts */}
          <div className="w-full mt-4 pt-3 border-t border-[#242432] grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 rounded bg-[#0B0B0E] text-cyan-400 border border-[#242432]">
              <span className="font-bold block">PITCH_BIAS (BRAKE)</span>
              <span>70% FRONT AXLE</span>
            </div>
            <div className="p-2 rounded bg-[#0B0B0E] text-[#E10600] border border-[#242432]">
              <span className="font-bold block">ROLL_BIAS (T3 / T9)</span>
              <span>88% OUTER LEFT</span>
            </div>
          </div>

        </div>

        {/* Right Column: FR & RR Cards */}
        <div className="xl:col-span-4 space-y-4">
          {renderCornerCard('FR', 'FRONT-RIGHT (INNER UNLOAD)')}
          {renderCornerCard('RR', 'REAR-RIGHT (DRIVE IN)')}
        </div>

      </div>

      {/* Tri-Mechanism Wear Stacked Area Chart */}
      <div className="tgr-card p-6">
        
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#242432]">
          <div>
            <h3 className="text-sm font-bold text-[#F5F5F7] font-mono tracking-wider">
              TRI-MECHANISM WEAR SUPERPOSITION [D(t)]
            </h3>
            <span className="text-xs text-[#8C8C9A] font-mono">
              CUMULATIVE DAMAGE BREAKDOWN ACROSS STINT LAPS
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#F5F5F7]">
              <span className="w-3 h-3 rounded bg-[#CBD5E1]"></span>
              <span>Mechanical Abrasion</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#F5F5F7]">
              <span className="w-3 h-3 rounded bg-[#D97706]"></span>
              <span>Cold Graining (&lt;85°C)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#F5F5F7]">
              <span className="w-3 h-3 rounded bg-[#E10600]"></span>
              <span>Thermal Blistering (&gt;118°C)</span>
            </span>
          </div>
        </div>

        {/* Recharts Stacked Area Canvas */}
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={wearData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E28" opacity={0.8} />

              <XAxis
                dataKey="lap_number"
                stroke="#8C8C9A"
                fontSize={11}
                fontFamily="JetBrains Mono"
                tickLine={false}
                label={{
                  value: 'STINT LAP NUMBER',
                  position: 'insideBottom',
                  offset: -4,
                  fill: '#8C8C9A',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                }}
              />

              <YAxis
                stroke="#8C8C9A"
                fontSize={11}
                fontFamily="JetBrains Mono"
                tickLine={false}
                label={{
                  value: 'DAMAGE RATE (x10⁻⁴/LAP)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#8C8C9A',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                  offset: 0,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0E0E16] border border-[#242432] p-3 rounded-lg shadow-xl font-mono text-xs max-w-xs">
                        <div className="font-bold text-[#F5F5F7] border-b border-[#242432] pb-1 mb-2">
                          LAP {d.lap_number} // DAMAGE BREAKDOWN
                        </div>
                        <div className="space-y-1 text-[11px] tabular-nums">
                          <div className="flex justify-between text-[#CBD5E1]">
                            <span>Abrasion:</span>
                            <span className="font-bold">+{d.abrasion}</span>
                          </div>
                          <div className="flex justify-between text-[#D97706]">
                            <span>Graining:</span>
                            <span className="font-bold">+{d.graining}</span>
                          </div>
                          <div className="flex justify-between text-[#E10600]">
                            <span>Blistering:</span>
                            <span className="font-bold">+{d.blistering}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-[#242432] font-bold text-white">
                            <span>Damage State:</span>
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
                stroke="#CBD5E1"
                fill="#CBD5E1"
                fillOpacity={0.8}
                name="Mechanical Abrasion"
              />
              <Area
                type="monotone"
                dataKey="graining"
                stackId="1"
                stroke="#D97706"
                fill="#D97706"
                fillOpacity={0.8}
                name="Cold Graining"
              />
              <Area
                type="monotone"
                dataKey="blistering"
                stackId="1"
                stroke="#E10600"
                fill="#E10600"
                fillOpacity={0.8}
                name="Thermal Blistering"
              />

              {/* Analytical Stint Cliff Marker */}
              <ReferenceLine
                x={cliffLap}
                stroke="#E10600"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `STINT_CLIFF_INFLECTION: LAP ${cliffLap}`,
                  position: 'top',
                  fill: '#E10600',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 'bold',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
};
