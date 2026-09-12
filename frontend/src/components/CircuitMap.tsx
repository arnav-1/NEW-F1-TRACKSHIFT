import React, { useState } from 'react';
import { BARCELONA_TURNS, type CircuitTurn } from '../data/barcelonaTrackData';
import type { LapTelemetryRecord } from '../types/telemetry';
import { Play, Pause, SkipBack, SkipForward, Flame, Zap, Gauge, Navigation, Info, ArrowUp, ArrowRight } from 'lucide-react';

interface CircuitMapProps {
  currentLap: LapTelemetryRecord;
  totalLaps: number;
  currentLapIndex: number;
  onLapChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const CircuitMap: React.FC<CircuitMapProps> = ({
  currentLap,
  totalLaps,
  currentLapIndex,
  onLapChange,
  isPlaying,
  onTogglePlay,
}) => {
  const [selectedTurn, setSelectedTurn] = useState<CircuitTurn>(BARCELONA_TURNS[2]); // Default Turn 3 (Limiting Hotspot)

  // Track SVG Path for Circuit de Barcelona-Catalunya (Modern 14-turn layout without chicane)
  // Scaled cleanly in a 600 x 360 canvas
  const trackPath = `
    M 340 310
    L 460 310
    C 480 310, 495 295, 495 270
    L 495 110
    C 495 80, 480 65, 460 70
    C 440 75, 430 95, 435 115
    C 445 140, 535 140, 535 190
    C 535 235, 465 255, 430 245
    C 385 235, 360 215, 335 220
    C 305 225, 275 200, 260 195
    C 240 190, 225 155, 205 150
    C 190 145, 175 75, 155 75
    C 130 75, 115 120, 105 160
    C 95 200, 115 230, 130 235
    C 145 240, 160 265, 160 280
    C 160 305, 210 310, 240 310
    Z
  `;

  return (
    <div className="space-y-6">
      
      {/* Top Telemetry KPI Metric Strip (High-Contrast White Livery Style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Fuel Mass Penalty */}
        <div className="tgr-card p-4 border-l-4 border-l-[#111116]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium mb-1">
            <span>FUEL PENALTY DELTA</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">0.033 s/kg</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#111116] telemetry-tabular">
            +{currentLap.fuel_penalty_s.toFixed(3)}s
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1 flex justify-between">
            <span>Mass on board:</span>
            <span className="font-bold text-[#111116]">{currentLap.fuel_remaining_kg} kg</span>
          </div>
        </div>

        {/* Metric 2: Track Evolution Grip Gain */}
        <div className="tgr-card p-4 border-l-4 border-l-[#0284C7]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium mb-1">
            <span className="text-[#0284C7] font-bold">TRACK EVOLUTION</span>
            <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-mono">1.25s Max</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#0284C7] telemetry-tabular">
            -{currentLap.track_evolution_s.toFixed(3)}s
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1 flex justify-between">
            <span>Grip saturation:</span>
            <span className="font-bold text-[#111116]">{((currentLap.track_evolution_s / 1.25) * 100).toFixed(0)}% saturated</span>
          </div>
        </div>

        {/* Metric 3: Microclimate Temperatures */}
        <div className="tgr-card p-4 border-l-4 border-l-[#F59E0B]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium mb-1">
            <span>MICROCLIMATE TEMPS</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono">IR Thermal</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#111116] telemetry-tabular flex items-baseline gap-2">
            <span>42.8°C</span>
            <span className="text-xs text-slate-400 font-normal">Track</span>
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1 flex justify-between">
            <span>Ambient Air:</span>
            <span className="font-bold text-[#111116]">28.1°C (Dry)</span>
          </div>
        </div>

        {/* Metric 4: Primary Limiting Tyre (FL) */}
        <div className="tgr-card p-4 border-l-4 border-l-[#E10600] bg-red-50/20">
          <div className="flex items-center justify-between text-[#E10600] text-xs font-mono font-bold mb-1">
            <span>LIMITING TYRE</span>
            <span className="text-[9px] bg-[#E10600] text-white px-1.5 py-0.5 rounded font-black tracking-wider">CRITICAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#E10600] telemetry-tabular">
            FRONT-LEFT (FL)
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1 flex justify-between">
            <span>Sliding Share:</span>
            <span className="font-black text-[#111116]">36.2% Workload</span>
          </div>
        </div>

        {/* Metric 5: Analytical Stint Cliff */}
        <div className="tgr-card p-4 border-l-4 border-l-purple-600 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium mb-1">
            <span>PREDICTED CLIFF</span>
            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono">&gt;0.25s / lap</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#111116] telemetry-tabular flex items-baseline gap-1.5">
            <span>LAP 19.4</span>
            <span className="text-xs text-red-600 font-bold">±0.5 Laps</span>
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1 flex justify-between">
            <span>Optimal In-Lap:</span>
            <span className="font-bold text-purple-700">Lap 18 – 20</span>
          </div>
        </div>

      </div>

      {/* Main Workspace Grid: Large Circuit Map & Turn Telemetry Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Interactive Vector Track Map */}
        <div className="lg:col-span-8 tgr-card p-6 relative">
          
          {/* Track Map Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-[#111116] flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#E10600]" />
                <span>Circuit de Barcelona-Catalunya (Montmeló)</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                4.657 km • 14 Turns (Chicane Eliminated) • Clockwise Orientation (65% Right-Hand Load)
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E10600] animate-pulse"></span>
                <span>Peak FL Stress (T3 & T9)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                <span>Heavy Braking / Pitch (T1 & T10)</span>
              </span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="w-full h-[380px] flex items-center justify-center relative bg-[#FBFBFC] rounded-xl border border-slate-100 p-2 overflow-hidden">
            
            {/* Watermark Logo */}
            <div className="absolute top-4 left-4 text-xs font-mono text-slate-400 font-bold uppercase tracking-widest pointer-events-none">
              TGR HAAS TELEMETRY MATRIX
            </div>

            <svg
              viewBox="80 50 480 280"
              className="w-full h-full max-h-[360px] drop-shadow-md"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Sector 1, 2, 3 Boundary Indicators */}
              <defs>
                <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#111116" />
                  <stop offset="100%" stopColor="#2A2A36" />
                </linearGradient>
              </defs>

              {/* Main Track Asphalt Ribbon */}
              <path
                d={trackPath}
                fill="none"
                stroke="#111116"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Inner Track White Guideline / Racing Line */}
              <path
                d={trackPath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.85"
              />

              {/* Start / Finish Line */}
              <line
                x1="460"
                y1="300"
                x2="460"
                y2="320"
                stroke="#E10600"
                strokeWidth="4"
              />
              <text x="445" y="335" fill="#E10600" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                FINISH
              </text>

              {/* Turn 3 Peak FL Thermal Highlight Glow */}
              <circle cx="520" cy="180" r="18" fill="#E10600" fillOpacity="0.2" className="animate-ping" />
              <circle cx="520" cy="180" r="10" fill="#E10600" fillOpacity="0.6" />

              {/* Turn 9 High-Speed Campsa FL Highlight Glow */}
              <circle cx="180" cy="75" r="16" fill="#E10600" fillOpacity="0.2" className="animate-ping" />
              <circle cx="180" cy="75" r="9" fill="#E10600" fillOpacity="0.6" />

              {/* Turn 1 & Turn 10 Braking Hotspots (Amber) */}
              <circle cx="480" cy="85" r="12" fill="#F59E0B" fillOpacity="0.4" />
              <circle cx="110" cy="170" r="12" fill="#F59E0B" fillOpacity="0.4" />

              {/* Interactive Turn Clickable Nodes T1 to T14 */}
              {BARCELONA_TURNS.map((turn) => {
                const isSelected = selectedTurn.number === turn.number;
                const isLimiting = turn.is_limiting_hotspot;
                const isBraking = turn.is_braking_hotspot;

                let nodeColor = '#111116';
                if (isLimiting) nodeColor = '#E10600';
                else if (isBraking) nodeColor = '#F59E0B';

                return (
                  <g
                    key={turn.number}
                    className="cursor-pointer transition-all duration-150 group"
                    onClick={() => setSelectedTurn(turn)}
                  >
                    {/* Node circle */}
                    <circle
                      cx={turn.x}
                      cy={turn.y}
                      r={isSelected ? 10 : 7}
                      fill={isSelected ? '#111116' : '#FFFFFF'}
                      stroke={isSelected ? '#E10600' : nodeColor}
                      strokeWidth={isSelected ? 3 : 2}
                      className="transition-all"
                    />

                    {/* Turn Number Tag */}
                    <text
                      x={turn.x}
                      y={turn.y - 12}
                      fill={isSelected ? '#E10600' : '#111116'}
                      fontSize={isSelected ? "11" : "9"}
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      T{turn.number}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Lap Playback & Stint Scrubber Bar */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onTogglePlay}
                className="w-9 h-9 rounded-lg bg-[#E10600] hover:bg-[#D40000] text-white flex items-center justify-center shadow-sm transition-all"
                title={isPlaying ? 'Pause Stint Simulation' : 'Play Stint Telemetry'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => onLapChange(Math.max(0, currentLapIndex - 1))}
                disabled={currentLapIndex === 0}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-colors"
                title="Previous Lap"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-500 font-medium">STINT LAP:</span>
                <span className="text-base font-black text-[#111116]">{currentLap.lap_number}</span>
                <span className="text-slate-400">/ {totalLaps}</span>
              </div>

              <button
                onClick={() => onLapChange(Math.min(totalLaps - 1, currentLapIndex + 1))}
                disabled={currentLapIndex === totalLaps - 1}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-colors"
                title="Next Lap"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Slider */}
            <div className="flex-1 w-full max-w-md flex items-center gap-3">
              <input
                type="range"
                min="0"
                max={totalLaps - 1}
                value={currentLapIndex}
                onChange={(e) => onLapChange(parseInt(e.target.value))}
                className="w-full accent-[#E10600] cursor-pointer"
              />
            </div>

            {/* Pace & Fuel Readout */}
            <div className="text-right text-[11px] text-slate-600">
              <div>Clean Pace: <strong className="text-[#111116] font-mono">{currentLap.pace_corrected_s.toFixed(3)}s</strong></div>
              <div>Fuel on Board: <strong className="text-[#111116] font-mono">{currentLap.fuel_remaining_kg} kg</strong></div>
            </div>
          </div>

        </div>

        {/* Right 4 Cols: Interactive Micro-Sector Turn Inspector Card */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Selected Turn Detail Card */}
          <div className="tgr-card p-5 border-t-4 border-t-[#E10600]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#111116] text-white flex items-center justify-center font-mono font-black text-sm">
                  T{selectedTurn.number}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#111116]">{selectedTurn.name}</h3>
                  <span className="text-[10px] text-slate-500 font-mono">Sector {selectedTurn.sector} Micro-Sector</span>
                </div>
              </div>

              {selectedTurn.is_limiting_hotspot ? (
                <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-red-100 text-[#E10600] border border-red-200">
                  PEAK FL WEAR
                </span>
              ) : selectedTurn.is_braking_hotspot ? (
                <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  HEAVY BRAKING
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  BALANCED LOAD
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {selectedTurn.description}
            </p>

            {/* Telemetry Channels for this Turn */}
            <div className="space-y-3 bg-[#F8F9FB] p-3.5 rounded-xl border border-slate-200 font-mono text-xs">
              
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  Peak Lateral Load:
                </span>
                <span className="font-black text-[#111116] text-sm">
                  {selectedTurn.lateral_g.toFixed(1)} G
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#E10600]" />
                  Dominant Loaded Tyre:
                </span>
                <span className={`font-black ${selectedTurn.dominant_tyre === 'FL' ? 'text-[#E10600]' : 'text-[#111116]'}`}>
                  {selectedTurn.dominant_tyre === 'FL' ? 'FRONT-LEFT (FL)' : selectedTurn.dominant_tyre}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                  Centripetal Roll Transfer:
                </span>
                <span className="font-black text-[#111116]">
                  {selectedTurn.roll_load_share_pct}% Axle Roll Share
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                  Braking Pitch Bias:
                </span>
                <span className="font-black text-[#111116]">
                  {selectedTurn.pitch_transfer_pct}% Front Bias
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-600" />
                  Frictional Heat Flux (Q_frict):
                </span>
                <span className="font-black text-[#E10600]">
                  ~{selectedTurn.heat_flux_kw} kW
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Apex Speed:</span>
                <span className="font-bold text-[#111116]">{selectedTurn.apex_speed_kmh} km/h</span>
              </div>

            </div>

            <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#E10600] flex-shrink-0" />
              <span>Click any turn marker on the track to inspect real-time lateral weight transfer.</span>
            </div>
          </div>

          {/* Circuit Physical Profile Card */}
          <div className="tgr-card p-4 text-xs font-mono">
            <h4 className="font-black text-[#111116] uppercase text-[11px] tracking-wider mb-2">
              Circuit Archetype Parameters
            </h4>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Macro Category:</span>
                <span className="font-bold text-[#111116]">High Downforce / Severe Lateral Scrub</span>
              </div>
              <div className="flex justify-between">
                <span>Asymmetric Ratio:</span>
                <span className="font-bold text-[#E10600]">65% Right / 35% Left</span>
              </div>
              <div className="flex justify-between">
                <span>Limiting Corner:</span>
                <span className="font-bold text-[#E10600]">Front-Left (36.2% Energy Share)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
