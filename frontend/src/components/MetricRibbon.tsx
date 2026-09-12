import React from 'react';
import { Fuel, TrendingUp, Thermometer, AlertTriangle, Crosshair } from 'lucide-react';
import type { LapTelemetryPoint } from '../types/telemetry';

interface MetricRibbonProps {
  currentLapData?: LapTelemetryPoint;
}

export const MetricRibbon: React.FC<MetricRibbonProps> = ({ currentLapData }) => {
  // Use current lap data or fallback to defaults
  const fuelPenalty = currentLapData ? `+${currentLapData.fuel_penalty_s.toFixed(3)}s` : '+0.985s';
  const fuelRemaining = currentLapData ? `${currentLapData.fuel_remaining_kg} kg` : '29.8 kg';
  const trackEvo = currentLapData ? `-${currentLapData.track_evolution_s.toFixed(3)}s` : '-0.820s';
  const limitingCorner = currentLapData ? currentLapData.limiting_corner : 'FL';
  const limitingShare = currentLapData ? `${(currentLapData.corners.FL.workload_share * 100).toFixed(1)}%` : '36.2%';

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      
      {/* Card 1: Fuel Penalty Delta */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5 text-haas-red" />
            Fuel Penalty Delta
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.5 rounded text-haas-gray font-mono border border-haas-border">
            0.033 s/kg
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-white telemetry-tabular tracking-tight">
          {fuelPenalty}
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1 font-mono">
          <span>Fuel on board:</span>
          <span className="text-haas-white font-medium">{fuelRemaining}</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-red/80"></div>
      </div>

      {/* Card 2: Track Evolution Saturation */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-haas-cyan" />
            Track Evolution
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.5 rounded text-haas-cyan font-mono border border-haas-cyan/20">
            E_track(n)
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-cyan telemetry-tabular tracking-tight">
          {trackEvo}
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1 font-mono">
          <span>Asymptotic Saturation:</span>
          <span className="text-haas-white font-medium">1.25s Max</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-cyan"></div>
      </div>

      {/* Card 3: Track & Ambient Thermal */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-haas-amber" />
            Microclimate Temps
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.5 rounded text-haas-amber font-mono border border-haas-amber/20">
            IR Sensor
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-white telemetry-tabular tracking-tight flex items-baseline gap-2">
          <span>42.8°C</span>
          <span className="text-xs text-haas-gray font-normal">Track</span>
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1 font-mono">
          <span>Ambient Air:</span>
          <span className="text-haas-white font-medium">28.1°C (Dry)</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-amber"></div>
      </div>

      {/* Card 4: Limiting Corner Flag */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group border-haas-red/40 bg-gradient-to-br from-[#15151E] to-[#1f1013]">
        <div className="flex items-center justify-between text-haas-red mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-bold flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-haas-red animate-pulse" />
            Limiting Corner
          </span>
          <span className="text-[10px] bg-haas-red/20 px-1.5 py-0.5 rounded text-haas-red font-mono font-bold border border-haas-red/40">
            CRITICAL
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-red telemetry-tabular tracking-tight">
          FRONT-LEFT ({limitingCorner})
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1 font-mono">
          <span>Sliding Energy Share:</span>
          <span className="text-haas-white font-bold">{limitingShare}</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-haas-red"></div>
      </div>

      {/* Card 5: Analytical Stint Cliff */}
      <div className="pitwall-panel p-3.5 relative overflow-hidden group col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-haas-gray mb-1">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-haas-white" />
            Predicted Stint Cliff
          </span>
          <span className="text-[10px] bg-[#0b0b0e] px-1.5 py-0.5 rounded text-haas-gray font-mono border border-haas-border">
            Marginal &gt; 0.25s
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black font-mono text-haas-white telemetry-tabular tracking-tight flex items-baseline gap-1.5">
          <span>LAP 19.4</span>
          <span className="text-xs text-haas-red font-mono font-bold">±0.5 Laps</span>
        </div>
        <div className="text-[11px] text-haas-gray flex items-center justify-between mt-1 font-mono">
          <span>Target In-Lap Window:</span>
          <span className="text-haas-amber font-medium">Lap 18 – 20</span>
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
      </div>

    </section>
  );
};
