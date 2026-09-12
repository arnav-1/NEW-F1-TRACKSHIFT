import React, { useState } from 'react';
import type { TyreCornerMetrics } from '../types/telemetry';
import { Zap, ArrowUp, ArrowRight } from 'lucide-react';

interface ChassisLoadMatrixProps {
  corners: Record<'FL' | 'FR' | 'RL' | 'RR', TyreCornerMetrics>;
}

export const ChassisLoadMatrix: React.FC<ChassisLoadMatrixProps> = ({ corners }) => {
  const [selectedCorner, setSelectedCorner] = useState<'FL' | 'FR' | 'RL' | 'RR'>('FL');

  const getStatusBadge = (status: 'OPTIMAL' | 'GRAINING_RISK' | 'OVERHEATING') => {
    switch (status) {
      case 'GRAINING_RISK':
        return {
          label: 'GRAINING RISK (<85°C)',
          classes: 'text-haas-amber bg-haas-amber/10 border-haas-amber/40 shadow-sm shadow-amber-500/10',
        };
      case 'OVERHEATING':
        return {
          label: 'BLISTERING RISK (>118°C)',
          classes: 'text-haas-red bg-haas-red/15 border-haas-red/50 shadow-sm shadow-red-500/20',
        };
      default:
        return {
          label: 'OPTIMAL WINDOW',
          classes: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
        };
    }
  };

  const renderCornerPod = (key: 'FL' | 'FR' | 'RL' | 'RR', title: string) => {
    const corner = corners[key];
    const isSelected = selectedCorner === key;
    const isLimiting = corner.is_limiting;
    const statusMeta = getStatusBadge(corner.status);

    return (
      <div
        key={key}
        onClick={() => setSelectedCorner(key)}
        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
          isSelected
            ? 'bg-[#181826] border-haas-red shadow-haas-red ring-1 ring-haas-red/50'
            : 'bg-[#101018] border-haas-border hover:border-haas-border/90 hover:bg-[#141420]'
        }`}
      >
        {/* Corner Pod Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center border ${
                isLimiting
                  ? 'bg-haas-red text-white border-haas-red shadow-sm shadow-haas-red/50'
                  : 'bg-[#181826] text-haas-white border-haas-border'
              }`}
            >
              {key}
            </div>
            <div>
              <div className="text-xs font-black text-haas-white flex items-center gap-1.5">
                <span>{title}</span>
                {isLimiting && (
                  <span className="text-[8px] bg-haas-red text-white font-mono font-black px-1.5 py-0.2 rounded">
                    LIMITING
                  </span>
                )}
              </div>
              <div className="text-[10px] text-haas-gray font-mono">
                Workload Share: <span className={`font-bold ${isLimiting ? 'text-haas-red' : 'text-haas-white'}`}>{(corner.workload_share * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Operating Window Status Pill */}
          <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusMeta.classes}`}>
            {statusMeta.label}
          </span>
        </div>

        {/* Thermal Telemetry Progress Stack (ODE Outputs) */}
        <div className="space-y-2 bg-[#0a0a10] p-2.5 rounded-lg border border-haas-border/70 my-1">
          {/* Tread Temperature */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-haas-gray flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-haas-red inline-block"></span>
                T_tread (Contact Patch)
              </span>
              <span className="text-haas-white font-black">{corner.tread_temp_c}°C</span>
            </div>
            <div className="w-full bg-[#181826] h-2 rounded-full overflow-hidden p-0.5 border border-haas-border/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  corner.tread_temp_c > 118
                    ? 'bg-haas-red shadow-sm shadow-haas-red'
                    : corner.tread_temp_c < 85
                    ? 'bg-haas-amber shadow-sm shadow-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(10, (corner.tread_temp_c / 140) * 100))}%` }}
              ></div>
            </div>
          </div>

          {/* Carcass Temperature */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-haas-gray flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                T_carcass (Internal Core)
              </span>
              <span className="text-haas-white font-black">{corner.carcass_temp_c}°C</span>
            </div>
            <div className="w-full bg-[#181826] h-2 rounded-full overflow-hidden p-0.5 border border-haas-border/50">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/50"
                style={{ width: `${Math.min(100, Math.max(10, (corner.carcass_temp_c / 140) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Damage Breakdown & Cumulative Wear */}
        <div className="mt-1.5 pt-1.5 border-t border-haas-border/50 flex items-center justify-between text-[10px] font-mono">
          <span className="text-haas-gray">Cumulative Damage D(t):</span>
          <span className="text-haas-white font-black">
            {(corner.cumulative_damage * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="pitwall-panel p-4 h-full flex flex-col justify-between">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-haas-border/70 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-haas-red" />
          <h2 className="text-sm font-bold text-haas-white font-mono">
            Panel 1: 4-Wheel Asymmetric Workload Matrix
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-haas-gray bg-[#0B0B0E] px-2 py-0.5 rounded border border-haas-border">
            Haas VF-24 Asymmetric Calibration
          </span>
          <span className="text-[10px] font-mono text-haas-red bg-haas-red/10 px-2 py-0.5 rounded border border-haas-red/30 font-bold">
            FL Dominant (36.2%)
          </span>
        </div>
      </div>

      {/* Center Layout: Front Pods, Technical Top-Down Car Silhouette, and Rear Pods */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3.5 my-auto items-center">
        {/* Left Column: Front Left & Rear Left (Outside Tyres in Barcelona Turn 3/9) */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          {renderCornerPod('FL', 'Front-Left (Outer)')}
          {renderCornerPod('RL', 'Rear-Left (Drive Outer)')}
        </div>

        {/* Center Column: Top-Down Haas VF-24 Technical Chassis Wireframe */}
        <div className="hidden xl:flex flex-col items-center justify-center p-2 bg-[#09090D] rounded-xl border border-haas-border relative overflow-hidden h-[340px]">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#242432_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>

          {/* Top Chassis Label */}
          <div className="absolute top-2 left-0 right-0 text-center">
            <span className="text-[9px] font-mono font-bold text-haas-gray bg-[#12121c] px-2 py-0.5 rounded border border-haas-border">
              VF-24 Top-Down Chassis
            </span>
          </div>

          {/* SVG F1 Car Technical Wireframe */}
          <svg
            viewBox="0 0 160 300"
            className="w-full h-full max-h-[260px] drop-shadow-[0_0_15px_rgba(225,6,0,0.25)] relative z-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Front Wing */}
            <path d="M 20 40 Q 80 25 140 40 L 142 50 Q 80 35 18 50 Z" fill="#1C1C26" stroke="#E10600" strokeWidth="1.5" />
            <line x1="80" y1="28" x2="80" y2="48" stroke="#E10600" strokeWidth="1.5" />

            {/* Nose Cone */}
            <path d="M 72 40 L 88 40 L 85 105 L 75 105 Z" fill="#151520" stroke="#8C8C9A" strokeWidth="1.5" />

            {/* Front Axle & Suspension Pushrods */}
            <line x1="28" y1="75" x2="74" y2="92" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="132" y1="75" x2="86" y2="92" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="2 2" />

            {/* Front Tyres */}
            <rect x="10" y="55" width="20" height="42" rx="4" fill="#0B0B0E" stroke="#E10600" strokeWidth="2" className="animate-pulse" />
            <text x="14" y="80" fill="#E10600" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">FL</text>
            <rect x="130" y="55" width="20" height="42" rx="4" fill="#0B0B0E" stroke="#242432" strokeWidth="1.5" />
            <text x="134" y="80" fill="#8C8C9A" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">FR</text>

            {/* Monocoque, Cockpit & Halo */}
            <path d="M 68 105 L 92 105 L 96 175 L 64 175 Z" fill="#15151E" stroke="#F5F5F7" strokeWidth="1.2" />
            {/* Halo Titanium Arc */}
            <path d="M 74 125 C 74 115, 86 115, 86 125 L 83 148 L 77 148 Z" fill="#242432" stroke="#E10600" strokeWidth="1.5" />
            {/* Driver Helmet #27 */}
            <circle cx="80" cy="138" r="5" fill="#E10600" stroke="#FFFFFF" strokeWidth="1" />

            {/* Sidepods with Haas Red Livery Streaks */}
            <path d="M 68 135 L 42 155 L 46 205 L 68 200 Z" fill="#12121A" stroke="#242432" strokeWidth="1.2" />
            <path d="M 92 135 L 118 155 L 114 205 L 92 200 Z" fill="#12121A" stroke="#242432" strokeWidth="1.2" />
            {/* Haas Red Side Accent */}
            <line x1="45" y1="165" x2="48" y2="200" stroke="#E10600" strokeWidth="2.5" />
            <line x1="115" y1="165" x2="112" y2="200" stroke="#E10600" strokeWidth="1.5" opacity="0.6" />

            {/* Engine Cover & Shark Fin */}
            <line x1="80" y1="165" x2="80" y2="235" stroke="#F5F5F7" strokeWidth="2" />
            <line x1="80" y1="175" x2="80" y2="230" stroke="#E10600" strokeWidth="3" opacity="0.8" />

            {/* Rear Axle */}
            <line x1="28" y1="240" x2="75" y2="240" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="132" y1="240" x2="85" y2="240" stroke="#8C8C9A" strokeWidth="1.5" strokeDasharray="2 2" />

            {/* Rear Tyres */}
            <rect x="8" y="218" width="24" height="46" rx="4" fill="#0B0B0E" stroke="#00E5FF" strokeWidth="1.8" />
            <text x="13" y="246" fill="#00E5FF" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">RL</text>
            <rect x="128" y="218" width="24" height="46" rx="4" fill="#0B0B0E" stroke="#242432" strokeWidth="1.5" />
            <text x="133" y="246" fill="#8C8C9A" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">RR</text>

            {/* Rear Wing & DRS Actuator */}
            <rect x="30" y="265" width="100" height="18" rx="2" fill="#151520" stroke="#E10600" strokeWidth="1.5" />
            <rect x="74" y="260" width="12" height="6" fill="#E10600" />
            <line x1="30" y1="274" x2="130" y2="274" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 2" />

            {/* Pitch & Roll Vector Dynamic Arrows on Car Body */}
            {/* Lateral Roll Arrow pointing Left (Barcelona Right-Hand Load) */}
            <path d="M 95 185 L 60 185 M 66 180 L 60 185 L 66 190" stroke="#E10600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Longitudinal Pitch Arrow pointing Forward (Braking Load) */}
            <path d="M 80 115 L 80 75 M 76 81 L 80 75 L 84 81" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Bottom Live Force Vector Summary */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[8px] font-mono text-haas-gray">
            <span className="text-haas-cyan">Pitch: Front Bias</span>
            <span className="text-haas-red">Roll: Outer Left</span>
          </div>
        </div>

        {/* Right Column: Front Right & Rear Right (Inner Tyres) */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          {renderCornerPod('FR', 'Front-Right (Inner)')}
          {renderCornerPod('RR', 'Rear-Right (Drive Inner)')}
        </div>
      </div>

      {/* Visual Dynamic Weight Shift Indicators Footer */}
      <div className="mt-3 pt-3 border-t border-haas-border/70 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-haas-border flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-haas-cyan/10 border border-haas-cyan/30 flex items-center justify-center flex-shrink-0">
            <ArrowUp className="w-4 h-4 text-haas-cyan" />
          </div>
          <div>
            <div className="text-[10px] text-haas-gray font-bold flex items-center gap-1.5">
              <span>Longitudinal Pitch Transfer</span>
              <span className="text-haas-cyan font-mono">(Braking Axle)</span>
            </div>
            <div className="text-haas-white font-extrabold text-xs">
              Up to <span className="text-haas-cyan">70% Front Bias</span> during heavy deceleration
            </div>
          </div>
        </div>

        <div className="bg-[#0B0B0E] p-2.5 rounded-lg border border-haas-border flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-haas-red/10 border border-haas-red/40 flex items-center justify-center flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-haas-red" />
          </div>
          <div>
            <div className="text-[10px] text-haas-gray font-bold flex items-center gap-1.5">
              <span>Centripetal Roll Transfer</span>
              <span className="text-haas-red font-mono">(T3 / T9 Lateral)</span>
            </div>
            <div className="text-haas-white font-extrabold text-xs">
              Up to <span className="text-haas-red">88% Outer Left Bias</span> on high-G right turns
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
