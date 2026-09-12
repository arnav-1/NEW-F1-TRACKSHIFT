import React from 'react';
import { Fuel, TrendingUp, Thermometer, AlertTriangle, Crosshair } from 'lucide-react';
import type { LapTelemetryRecord } from '../types/telemetry';

interface MetricRibbonProps {
  currentLapData?: LapTelemetryRecord;
}

export const MetricRibbon: React.FC<MetricRibbonProps> = ({ currentLapData }) => {
  const fuelPenalty = currentLapData ? `+${currentLapData.fuel_penalty_s.toFixed(3)}s` : '+0.985s';
  const fuelRemaining = currentLapData ? `${currentLapData.fuel_remaining_kg} kg` : '29.8 kg';
  const trackEvo = currentLapData ? `-${currentLapData.track_evolution_s.toFixed(3)}s` : '-0.820s';
  const limitingShare = currentLapData ? `${(currentLapData.corners.FL.workload_share * 100).toFixed(1)}%` : '36.2%';
  const flCarcass = currentLapData ? `${currentLapData.corners.FL.carcass_temp_c}°C` : '104.1°C';
  const flTread = currentLapData ? `${currentLapData.corners.FL.tread_temp_c}°C` : '112.4°C';

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      
      {/* 1. Dynamic Fuel Penalty */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group hover:border-haas-border/90 transition-all">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-bold flex items-center gap-1.5 text-haas-white">
            <Fuel className="w-3.5 h-3.5 text-haas-red" />
            Fuel Mass Penalty
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.2 rounded text-haas-gray font-mono border border-haas-border">
            0.033 s/kg
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-white telemetry-tabular tracking-tight">
          {fuelPenalty}
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1.5 font-mono">
          <span>Fuel On-Board (M_fuel):</span>
          <span className="text-haas-white font-bold">{fuelRemaining}</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-red"></div>
      </div>

      {/* 2. Track Evolution Grip Gain */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group hover:border-haas-cyan/40 transition-all">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-bold flex items-center gap-1.5 text-haas-cyan">
            <TrendingUp className="w-3.5 h-3.5 text-haas-cyan" />
            Track Evolution Gain
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.2 rounded text-haas-cyan font-mono border border-haas-cyan/30">
            E_track(n)
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-cyan telemetry-tabular tracking-tight">
          {trackEvo}
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1.5 font-mono">
          <span>Saturation Limit:</span>
          <span className="text-haas-white font-bold">1.250s Max (n/120)</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-cyan"></div>
      </div>

      {/* 3. Track & Ambient Thermals */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group hover:border-haas-amber/40 transition-all">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-bold flex items-center gap-1.5 text-haas-amber">
            <Thermometer className="w-3.5 h-3.5 text-haas-amber" />
            Track & Ambient Thermals
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.2 rounded text-haas-amber font-mono border border-haas-amber/30">
            Open-Meteo IR
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-white telemetry-tabular tracking-tight flex items-baseline gap-2">
          <span>42.8°C</span>
          <span className="text-xs text-haas-gray font-normal font-mono">T_track</span>
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1.5 font-mono">
          <span>Ambient Air (T_amb):</span>
          <span className="text-haas-white font-bold">28.1°C (Dry)</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-amber"></div>
      </div>

      {/* 4. Limiting Corner Flagged Haas Red */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group border-haas-red/60 bg-gradient-to-br from-[#15151E] to-[#220d11] shadow-haas-red transition-all">
        <div className="flex items-center justify-between text-haas-red mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-black flex items-center gap-1.5 text-haas-red">
            <Crosshair className="w-3.5 h-3.5 text-haas-red animate-pulse" />
            Limiting Corner
          </span>
          <span className="text-[9px] bg-haas-red px-1.5 py-0.2 rounded text-white font-mono font-black tracking-wider">
            CRITICAL
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-red telemetry-tabular tracking-tight">
          FRONT-LEFT (FL)
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1 font-mono">
          <span>Sliding Energy: <strong className="text-white font-extrabold">{limitingShare}</strong></span>
          <span className="text-[10px] text-haas-red font-bold">{flTread}</span>
        </div>
        <div className="text-[10px] text-haas-gray flex items-center justify-between font-mono">
          <span>Carcass Core Temp:</span>
          <span className="text-cyan-400 font-bold">{flCarcass}</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-red"></div>
      </div>

      {/* 5. Analytical Stint Cliff */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group col-span-2 md:col-span-1 hover:border-purple-500/40 transition-all">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-bold flex items-center gap-1.5 text-haas-white">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            Analytical Stint Cliff
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.2 rounded text-haas-gray font-mono border border-haas-border">
            &gt; 0.25 s/lap
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-white telemetry-tabular tracking-tight flex items-baseline gap-1.5">
          <span>LAP 19.4</span>
          <span className="text-[11px] text-haas-red font-mono font-bold bg-haas-red/10 px-1 rounded border border-haas-red/30">
            ±0.5 Laps
          </span>
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1.5 font-mono">
          <span>Target Box Window:</span>
          <span className="text-purple-300 font-bold">Lap 18 – 20</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
      </div>

    </section>
  );
};
