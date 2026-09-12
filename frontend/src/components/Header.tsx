import React from 'react';
import type { CircuitId, SessionId } from '../types/telemetry';
import { Sliders, Flag } from 'lucide-react';

interface HeaderProps {
  currentCircuit: CircuitId;
  onCircuitChange: (c: CircuitId) => void;
  currentSession: SessionId;
  onSessionChange: (s: SessionId) => void;
  onOpenAblation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCircuit,
  onCircuitChange,
  currentSession,
  onSessionChange,
  onOpenAblation,
}) => {
  return (
    <header className="bg-haas-card/90 backdrop-blur-md border-b border-haas-border sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="max-w-[1700px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
        
        {/* Left: Haas F1 Brand & Driver Tag */}
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-3">
            {/* Haas F1 Badge */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded bg-[#101018] border border-haas-border flex items-center justify-center font-black text-xl italic tracking-tighter text-haas-white relative overflow-hidden group">
                <span className="text-haas-white font-bold">H</span>
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-haas-red group-hover:w-1.5 transition-all"></div>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs text-haas-gray uppercase">
                  <span>MoneyGram</span>
                  <span className="text-haas-red font-black">HAAS F1</span>
                  <span>TEAM</span>
                </div>
                <div className="text-haas-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                  <span>TRACKSHIFT</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-haas-red/20 text-haas-red border border-haas-red/40 font-mono">PIT-WALL TELEMETRY</span>
                </div>
              </div>
            </div>

            {/* Red accent divider */}
            <div className="h-7 w-[1px] bg-haas-border hidden sm:block"></div>

            {/* Driver Pill: Hülkenberg #27 */}
            <div className="hidden sm:flex items-center gap-2.5 bg-[#0e0e16] border border-haas-border/80 px-3 py-1.5 rounded-md">
              <div className="w-5 h-5 rounded-full bg-haas-red/20 border border-haas-red flex items-center justify-center font-mono font-bold text-xs text-haas-red">
                27
              </div>
              <div className="text-xs">
                <div className="font-semibold text-haas-white flex items-center gap-1">
                  <span>Nico Hülkenberg</span>
                  <span className="text-[10px] text-haas-gray font-mono">GER</span>
                </div>
                <div className="text-[10px] text-haas-gray font-mono">VF-24 Chassis • #27</div>
              </div>
            </div>
          </div>

          {/* Calibrated Badge */}
          <div className="flex items-center gap-2 bg-[#0B0B0E] border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden md:inline font-medium">PHYSICS CALIBRATED</span>
            <span className="text-[10px] bg-emerald-950/60 px-1.5 py-0.5 rounded text-emerald-300 font-bold border border-emerald-500/20">25/25 TESTS</span>
          </div>
        </div>

        {/* Center: Circuit & Session Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-center xl:justify-end">
          
          {/* Circuit Dropdown */}
          <div className="flex items-center gap-2 bg-[#0B0B0E] border border-haas-border rounded-md px-2.5 py-1">
            <Flag className="w-3.5 h-3.5 text-haas-red" />
            <select
              value={currentCircuit}
              onChange={(e) => onCircuitChange(e.target.value as CircuitId)}
              className="bg-transparent text-xs font-medium text-haas-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="barcelona" className="bg-[#15151E] text-haas-white">
                Circuit de Barcelona-Catalunya (4.657 km)
              </option>
              <option value="silverstone" className="bg-[#15151E] text-haas-white">
                Silverstone Circuit (5.891 km)
              </option>
            </select>
          </div>

          {/* Session Switcher Tabs */}
          <div className="flex items-center bg-[#0B0B0E] p-0.5 rounded-md border border-haas-border">
            {(['FP1', 'FP2', 'FP3', 'Race'] as SessionId[]).map((sess) => {
              const isActive = currentSession === sess;
              return (
                <button
                  key={sess}
                  onClick={() => onSessionChange(sess)}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-all duration-150 ${
                    isActive
                      ? 'bg-haas-red text-white shadow-sm shadow-haas-red/40'
                      : 'text-haas-gray hover:text-haas-white hover:bg-[#15151E]'
                  }`}
                >
                  {sess === 'Race' ? 'Race (Held-Out)' : sess}
                </button>
              );
            })}
          </div>

          {/* Ablation Settings Drawer Trigger */}
          <button
            onClick={onOpenAblation}
            className="flex items-center gap-1.5 bg-[#0B0B0E] hover:bg-[#1a1a26] text-haas-gray hover:text-haas-white border border-haas-border hover:border-haas-red/40 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            title="Configure Physics Assumptions & Parameters"
          >
            <Sliders className="w-3.5 h-3.5 text-haas-red" />
            <span className="hidden sm:inline font-mono">Ablation Config</span>
          </button>
        </div>

      </div>
    </header>
  );
};
