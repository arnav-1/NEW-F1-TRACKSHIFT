import React, { useState } from 'react';
import type { TyreCornerState } from '../types/telemetry';
import { Zap, ArrowUp, ArrowRight } from 'lucide-react';

interface ChassisLoadMatrixProps {
  corners: {
    FL: TyreCornerState;
    FR: TyreCornerState;
    RL: TyreCornerState;
    RR: TyreCornerState;
  };
}

export const ChassisLoadMatrix: React.FC<ChassisLoadMatrixProps> = ({ corners }) => {
  const [selectedCorner, setSelectedCorner] = useState<'FL' | 'FR' | 'RL' | 'RR'>('FL');

  const getThermalStatus = (tread: number) => {
    if (tread < 90) return { label: 'GRAINING RISK', color: 'text-haas-amber bg-haas-amber/10 border-haas-amber/30' };
    if (tread > 115) return { label: 'OVERHEATING / BLISTER', color: 'text-haas-red bg-haas-red/10 border-haas-red/40' };
    return { label: 'OPTIMAL WINDOW', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' };
  };

  const cornerKeys: Array<'FL' | 'FR' | 'RL' | 'RR'> = ['FL', 'FR', 'RL', 'RR'];

  return (
    <div className="pitwall-panel p-4 h-full flex flex-col justify-between">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-haas-border/70 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-haas-red" />
          <h2 className="text-sm font-bold tracking-tight text-haas-white font-mono uppercase">
            Panel 1: 4-Wheel Asymmetric Workload Matrix
          </h2>
        </div>
        <span className="text-[10px] font-mono text-haas-gray bg-[#0B0B0E] px-2 py-0.5 rounded border border-haas-border">
          West & Limebeer Roll-Pitch Model
        </span>
      </div>

      {/* Main Interactive Grid: Top-Down Chassis Wireframe & Corner Pods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-auto">
        {cornerKeys.map((key) => {
          const corner = corners[key];
          const isSelected = selectedCorner === key;
          const status = getThermalStatus(corner.tread_temp_c);
          const isLimiting = corner.is_limiting;

          return (
            <div
              key={key}
              onClick={() => setSelectedCorner(key)}
              className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-[#1a1a27] border-haas-red shadow-haas-red'
                  : 'bg-[#101018] border-haas-border hover:border-haas-border/80'
              }`}
            >
              {/* Header inside corner pod */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded font-mono font-black text-xs flex items-center justify-center border ${
                    isLimiting
                      ? 'bg-haas-red text-white border-haas-red shadow-sm shadow-haas-red/50'
                      : 'bg-[#181824] text-haas-gray border-haas-border'
                  }`}>
                    {key}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-haas-white">
                      {key === 'FL' && 'Front Left (Outer)'}
                      {key === 'FR' && 'Front Right (Inner)'}
                      {key === 'RL' && 'Rear Left (Drive Outer)'}
                      {key === 'RR' && 'Rear Right (Drive Inner)'}
                    </span>
                    <div className="text-[10px] text-haas-gray font-mono">
                      Workload Share: <span className={`font-bold ${isLimiting ? 'text-haas-red' : 'text-haas-white'}`}>{(corner.workload_share * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                  {status.label}
                </span>
              </div>

              {/* Thermal Stack Dual Bars */}
              <div className="space-y-1.5 mt-2 bg-[#0B0B0E] p-2 rounded border border-haas-border/60">
                {/* Tread Temp */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-haas-gray mb-0.5">
                    <span>Tread Temp (T_tread)</span>
                    <span className="text-haas-white font-bold">{corner.tread_temp_c}°C</span>
                  </div>
                  <div className="w-full bg-[#181824] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        corner.tread_temp_c > 115 ? 'bg-haas-red' : corner.tread_temp_c < 90 ? 'bg-haas-amber' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(10, (corner.tread_temp_c / 140) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Carcass Temp */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-haas-gray mb-0.5">
                    <span>Carcass Temp (T_carc)</span>
                    <span className="text-haas-white font-bold">{corner.carcass_temp_c}°C</span>
                  </div>
                  <div className="w-full bg-[#181824] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(10, (corner.carcass_temp_c / 140) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Cumulative Wear Bar */}
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                <span className="text-haas-gray">Cumulative Damage:</span>
                <span className="text-haas-white font-bold">{(corner.cumulative_damage * 100).toFixed(1)}%</span>
              </div>

              {/* Limiting tyre highlight banner */}
              {isLimiting && (
                <div className="absolute -top-1 -right-1 bg-haas-red text-white text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-bl shadow-sm">
                  Primary Limiting
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Pitch & Roll Vector Callouts Footer */}
      <div className="mt-3 pt-3 border-t border-haas-border/70 grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-[#0B0B0E] p-2 rounded border border-haas-border flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-haas-cyan flex-shrink-0" />
          <div>
            <div className="text-[10px] text-haas-gray uppercase font-semibold">Pitch (Braking Shift)</div>
            <div className="text-haas-white font-bold">65% – 70% Front Axle Bias</div>
          </div>
        </div>

        <div className="bg-[#0B0B0E] p-2 rounded border border-haas-border flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-haas-red flex-shrink-0" />
          <div>
            <div className="text-[10px] text-haas-gray uppercase font-semibold">Roll (T3 / T9 Lateral)</div>
            <div className="text-haas-white font-bold">85% – 88% Outer Left Bias</div>
          </div>
        </div>
      </div>
    </div>
  );
};
