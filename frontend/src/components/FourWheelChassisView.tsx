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
import { Flame } from 'lucide-react';

interface FourWheelChassisViewProps {
  corners: Record<'FL' | 'FR' | 'RL' | 'RR', TyreCornerMetrics>;
  telemetryData: LapTelemetryRecord[];
}

export const FourWheelChassisView: React.FC<FourWheelChassisViewProps> = ({
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
      tread_temp: fl.tread_temp_c,
      cumulative: Number((fl.cumulative_damage * 100).toFixed(1)),
    };
  });

  const cliffLap = 19.4;

  const renderCornerCard = (cornerKey: 'FL' | 'FR' | 'RL' | 'RR', title: string) => {
    const corner = corners[cornerKey];
    const isLimiting = cornerKey === 'FL';

    let statusLabel = 'OPTIMAL WINDOW';
    let statusClass = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';

    if (isLimiting) {
      statusLabel = 'BLISTERING THRESHOLD APPROACHING';
      statusClass = 'bg-red-950/60 text-[#E10600] border-red-800/60 font-black';
    } else if (corner.tread_temp_c < 85) {
      statusLabel = 'COLD GRAINING RISK';
      statusClass = 'bg-amber-950/40 text-[#FF9100] border-amber-800/40';
    }

    return (
      <div
        className={`tgr-card p-5 relative overflow-hidden transition-all ${
          isLimiting
            ? 'border-2 border-[#E10600] shadow-haas-red bg-gradient-to-br from-[#15151E] to-[#220d11]'
            : 'border border-[#242432] hover:border-[#38384D]'
        }`}
      >
        {/* Corner Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                isLimiting
                  ? 'bg-[#E10600] text-white shadow-sm shadow-red-500/50'
                  : 'bg-[#1E1E2C] text-[#F5F5F7] border border-[#242432]'
              }`}
            >
              {cornerKey}
            </div>
            <div>
              <div className="text-xs font-black text-[#F5F5F7] flex items-center gap-1.5">
                <span>{title}</span>
                {isLimiting && (
                  <span className="text-[9px] bg-[#E10600] text-white px-1.5 py-0.2 rounded font-mono font-black">
                    LIMITING TYRE
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#8C8C9A] font-mono">
                Workload Share: <strong className={isLimiting ? 'text-[#E10600]' : 'text-[#F5F5F7]'}>
                  {(corner.workload_share * 100).toFixed(1)}%
                </strong>
              </div>
            </div>
          </div>

          <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        {/* Thermodynamic State Progress Bars */}
        <div className="space-y-2.5 bg-[#0B0B0E] p-3 rounded-xl border border-[#242432] my-2 font-mono">
          
          {/* Tread Temp */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#8C8C9A]">Contact Patch (T_tread):</span>
              <span className="font-black text-[#F5F5F7]">{corner.tread_temp_c}°C</span>
            </div>
            <div className="w-full bg-[#1A1A26] h-2 rounded-full overflow-hidden p-0.5 border border-[#242432]/60">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  corner.tread_temp_c > 115 ? 'bg-[#E10600]' : corner.tread_temp_c < 85 ? 'bg-[#FF9100]' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(10, (corner.tread_temp_c / 135) * 100))}%` }}
              ></div>
            </div>
          </div>

          {/* Carcass Temp */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#8C8C9A]">Internal Core (T_carcass):</span>
              <span className="font-black text-[#00E5FF]">{corner.carcass_temp_c}°C</span>
            </div>
            <div className="w-full bg-[#1A1A26] h-2 rounded-full overflow-hidden p-0.5 border border-[#242432]/60">
              <div
                className="h-full bg-[#00E5FF] rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/40"
                style={{ width: `${Math.min(100, Math.max(10, (corner.carcass_temp_c / 135) * 100))}%` }}
              ></div>
            </div>
          </div>

        </div>

        {/* Damage Expended Indicator */}
        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#242432]/70">
          <span className="text-[#8C8C9A]">Cumulative Damage D(t):</span>
          <span className="font-black text-[#F5F5F7]">{(corner.cumulative_damage * 100).toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Section: Top-Down Chassis Wireframe Flanked by 4 Corner Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        
        {/* Left 4 Cols: Front-Left & Rear-Left */}
        <div className="xl:col-span-4 space-y-4">
          {renderCornerCard('FL', 'Front-Left (Outer Loaded)')}
          {renderCornerCard('RL', 'Rear-Left (Drive Outer)')}
        </div>

        {/* Center 4 Cols: Top-Down VF-26 Technical Chassis Model (Black Pit-Wall) */}
        <div className="xl:col-span-4 tgr-card p-6 flex flex-col items-center justify-center relative bg-[#0E0E14] min-h-[380px] border border-[#242432]">
          
          <div className="text-center mb-2">
            <span className="text-[10px] font-mono font-bold text-[#8C8C9A] bg-[#181824] px-3 py-1 rounded-full border border-[#242432]">
              VF-26 Chassis Load Dynamics
            </span>
          </div>

          {/* SVG F1 Car Top-Down Chassis */}
          <svg
            viewBox="0 0 160 300"
            className="w-full h-full max-h-[270px] drop-shadow-[0_0_20px_rgba(225,6,0,0.25)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Front Wing */}
            <path d="M 18 40 Q 80 25 142 40 L 144 50 Q 80 35 16 50 Z" fill="#151520" stroke="#E10600" strokeWidth="1.5" />
            <rect x="15" y="32" width="6" height="22" rx="1" fill="#E10600" />
            <rect x="139" y="32" width="6" height="22" rx="1" fill="#E10600" />

            {/* Nose Cone */}
            <path d="M 72 40 L 88 40 L 85 105 L 75 105 Z" fill="#1C1C28" stroke="#8C8C9A" strokeWidth="1.5" />
            <line x1="80" y1="40" x2="80" y2="85" stroke="#E10600" strokeWidth="2.5" />

            {/* Front Suspension Pushrods */}
            <line x1="28" y1="75" x2="74" y2="92" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="132" y1="75" x2="86" y2="92" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Front Tyres */}
            <rect x="10" y="55" width="20" height="42" rx="3" fill="#0B0B0E" stroke="#E10600" strokeWidth="2.5" className="animate-pulse" />
            <text x="14" y="80" fill="#E10600" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">FL</text>
            <rect x="130" y="55" width="20" height="42" rx="3" fill="#0B0B0E" stroke="#333345" strokeWidth="1.5" />
            <text x="134" y="80" fill="#8C8C9A" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">FR</text>

            {/* Monocoque Body & Cockpit */}
            <path d="M 68 105 L 92 105 L 96 175 L 64 175 Z" fill="#151520" stroke="#F5F5F7" strokeWidth="1.2" />
            {/* Halo Titanium Arc */}
            <path d="M 74 125 C 74 115, 86 115, 86 125 L 83 148 L 77 148 Z" fill="#242432" stroke="#E10600" strokeWidth="1.5" />
            {/* Driver Helmet #27 */}
            <circle cx="80" cy="138" r="5" fill="#E10600" stroke="#FFFFFF" strokeWidth="1" />

            {/* Sidepods with Haas Red Livery Streaks */}
            <path d="M 68 135 L 42 155 L 46 205 L 68 200 Z" fill="#12121A" stroke="#242432" strokeWidth="1.2" />
            <path d="M 92 135 L 118 155 L 114 205 L 92 200 Z" fill="#12121A" stroke="#242432" strokeWidth="1.2" />
            {/* Bold Red Racing Flashes */}
            <line x1="45" y1="165" x2="48" y2="200" stroke="#E10600" strokeWidth="3" />
            <line x1="115" y1="165" x2="112" y2="200" stroke="#E10600" strokeWidth="2" opacity="0.7" />

            {/* Engine Airbox & Shark Fin */}
            <line x1="80" y1="165" x2="80" y2="235" stroke="#F5F5F7" strokeWidth="2" />
            <line x1="80" y1="175" x2="80" y2="230" stroke="#E10600" strokeWidth="3" opacity="0.8" />

            {/* Rear Suspension */}
            <line x1="28" y1="240" x2="75" y2="240" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="132" y1="240" x2="85" y2="240" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Rear Tyres */}
            <rect x="8" y="218" width="24" height="46" rx="3" fill="#0B0B0E" stroke="#00E5FF" strokeWidth="2" />
            <text x="13" y="246" fill="#00E5FF" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">RL</text>
            <rect x="128" y="218" width="24" height="46" rx="3" fill="#0B0B0E" stroke="#333345" strokeWidth="1.5" />
            <text x="133" y="246" fill="#8C8C9A" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">RR</text>

            {/* Rear Wing */}
            <rect x="28" y="265" width="104" height="18" rx="2" fill="#151520" stroke="#E10600" strokeWidth="1.5" />
            <line x1="28" y1="274" x2="132" y2="274" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 2" />

            {/* Pitch Arrow (Forward Braking Load) */}
            <path d="M 80 115 L 80 75 M 76 81 L 80 75 L 84 81" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Roll Arrow (Lateral Shift to Outside Left) */}
            <path d="M 95 185 L 60 185 M 66 180 L 60 185 L 66 190" stroke="#E10600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Dynamic Weight Transfer Callouts */}
          <div className="w-full mt-4 pt-3 border-t border-[#242432] grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
              <span className="font-bold block">Pitch Transfer (Braking)</span>
              <span>70% Front Axle Bias</span>
            </div>
            <div className="p-2 rounded bg-red-950/40 text-red-300 border border-red-800/40">
              <span className="font-bold block">Roll Transfer (T3 / T9)</span>
              <span>88% Outer Left Bias</span>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Front-Right & Rear-Right */}
        <div className="xl:col-span-4 space-y-4">
          {renderCornerCard('FR', 'Front-Right (Inner Unloaded)')}
          {renderCornerCard('RR', 'Rear-Right (Drive Inner)')}
        </div>

      </div>

      {/* Bottom Section: Tri-Mechanism Wear Stacked Area Chart */}
      <div className="tgr-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#242432]">
          <div>
            <h3 className="text-sm font-black text-[#F5F5F7] font-mono flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#E10600]" />
              <span>Tri-Mechanism Wear Decomposition & Cliff Forecaster</span>
            </h3>
            <span className="text-xs text-[#8C8C9A] font-mono">
              Physical degradation breakdown: Mechanical Abrasion + Cold Graining + Thermal Blistering
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-200 font-bold">
              <span className="w-3 h-3 rounded-sm bg-slate-300"></span>
              <span>1. Mechanical Abrasion (w_p)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#FF9100] font-bold">
              <span className="w-3 h-3 rounded-sm bg-[#FF9100]"></span>
              <span>2. Cold Graining (&lt;85°C)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#E10600] font-bold">
              <span className="w-3 h-3 rounded-sm bg-[#E10600]"></span>
              <span>3. Thermal Blistering (&gt;118°C)</span>
            </span>
          </div>
        </div>

        {/* Stacked Area Chart */}
        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={wearData}
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="darkGradAbrasion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="darkGradGraining" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9100" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FF9100" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="darkGradBlistering" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E10600" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#8A0000" stopOpacity={0.2} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#242432" opacity={0.8} />
              
              <XAxis
                dataKey="lap_number"
                stroke="#8C8C9A"
                fontSize={11}
                fontFamily="JetBrains Mono"
                tickLine={false}
                label={{
                  value: 'Tyre Age (Laps Completed)',
                  position: 'insideBottom',
                  offset: -4,
                  fill: '#8C8C9A',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                }}
              />

              <YAxis
                stroke="#F5F5F7"
                fontSize={11}
                fontFamily="JetBrains Mono"
                tickLine={false}
                label={{
                  value: 'Physical Damage Rate (×10⁻⁴)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#F5F5F7',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                  offset: 0,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0E0E16] border border-[#242432] p-3.5 rounded-xl shadow-2xl font-mono text-xs max-w-xs">
                        <div className="flex items-center justify-between border-b border-[#242432] pb-1 mb-2 font-black text-[#F5F5F7]">
                          <span>LAP {data.lap_number} (FL Corner)</span>
                          <span className="text-[#00E5FF]">{data.tread_temp}°C Tread</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-slate-300">
                            <span>Mechanical Abrasion:</span>
                            <span className="font-bold text-white">{data.abrasion}</span>
                          </div>
                          <div className="flex justify-between text-[#FF9100]">
                            <span>Cold Graining:</span>
                            <span className="font-bold">{data.graining}</span>
                          </div>
                          <div className="flex justify-between text-[#E10600]">
                            <span>Thermal Blistering:</span>
                            <span className="font-bold">{data.blistering}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-[#242432] font-black">
                            <span className="text-[#F5F5F7]">Total Wear Rate:</span>
                            <span className="text-emerald-400">{data.total_damage}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* 1. Mechanical Abrasion */}
              <Area
                type="monotone"
                dataKey="abrasion"
                stackId="1"
                stroke="#CBD5E1"
                fill="url(#darkGradAbrasion)"
                strokeWidth={1.5}
              />

              {/* 2. Cold Graining */}
              <Area
                type="monotone"
                dataKey="graining"
                stackId="1"
                stroke="#FF9100"
                fill="url(#darkGradGraining)"
                strokeWidth={1.5}
              />

              {/* 3. Thermal Blistering */}
              <Area
                type="monotone"
                dataKey="blistering"
                stackId="1"
                stroke="#E10600"
                fill="url(#darkGradBlistering)"
                strokeWidth={2}
              />

              {/* Stint Cliff Reference Line */}
              <ReferenceLine
                x={cliffLap}
                stroke="#E10600"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `PREDICTED STINT CLIFF (LAP ${cliffLap})`,
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

        {/* Footer Notes */}
        <div className="mt-4 pt-4 border-t border-[#242432] flex flex-wrap items-center justify-between text-xs font-mono text-[#8C8C9A] gap-2">
          <span>Non-linear blistering acceleration initiates when T_tread exceeds 118°C</span>
          <span className="font-bold text-[#E10600]">Target box lap: 18 - 20</span>
        </div>
      </div>

    </div>
  );
};
