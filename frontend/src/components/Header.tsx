import React from 'react';
import type { CircuitId, SessionId, TyreCompound } from '../types/telemetry';
import { Sliders, Flag, Wind, Droplets } from 'lucide-react';

interface HeaderProps {
  currentCircuit: CircuitId;
  onCircuitChange: (c: CircuitId) => void;
  currentSession: SessionId;
  onSessionChange: (s: SessionId) => void;
  currentCompound: TyreCompound;
  onCompoundChange: (c: TyreCompound) => void;
  onOpenAblation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCircuit,
  onCircuitChange,
  currentSession,
  onSessionChange,
  currentCompound,
  onCompoundChange,
  onOpenAblation,
}) => {
  const compounds: Array<{ id: TyreCompound; label: string; code: string; color: string; border: string; bg: string }> = [
    { id: 'SOFT', label: 'SOFT', code: 'C3', color: 'text-white', border: 'border-pirelli-soft', bg: 'bg-pirelli-soft' },
    { id: 'MEDIUM', label: 'MEDIUM', code: 'C2', color: 'text-black', border: 'border-pirelli-medium', bg: 'bg-pirelli-medium' },
    { id: 'HARD', label: 'HARD', code: 'C1', color: 'text-black', border: 'border-pirelli-hard', bg: 'bg-pirelli-hard' },
  ];

  return (
    <header className="bg-haas-card/95 backdrop-blur-md border-b border-haas-border sticky top-0 z-40 px-4 lg:px-6 py-2.5 shadow-xl">
      <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-3">
        
        {/* Left: Haas F1 Official Lockup with Speedline & Driver Pill */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-3">
            {/* Haas Official Speedline Brand Lockup */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#0E0E14] border border-[#2B2B3D] shadow-inner overflow-hidden group">
                <span className="text-haas-white font-black text-2xl italic tracking-tighter pl-0.5">H</span>
                {/* Dynamic Haas red speedline accents */}
                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-haas-red group-hover:w-2 transition-all"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-1.5 bg-haas-red/40 transform -rotate-45"></div>
              </div>

              <div className="leading-tight">
                <div className="flex items-center gap-1.5 font-bold tracking-widest text-[11px] text-haas-gray uppercase">
                  <span>MoneyGram</span>
                  <span className="text-haas-red font-black tracking-wider">HAAS F1</span>
                  <span>TEAM</span>
                </div>
                <div className="text-haas-white font-black text-sm tracking-tight flex items-center gap-2">
                  <span>TRACKSHIFT</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-haas-red/20 text-haas-red border border-haas-red/40 font-mono tracking-wide font-bold">
                    PIT-WALL ENGINEERING CONSOLE
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-[1px] bg-haas-border/80 hidden sm:block"></div>

            {/* Driver Pill: Nico Hülkenberg #27 | VF-24 with Interactive Compound Badge */}
            <div className="flex items-center gap-2.5 bg-[#0b0b10] border border-haas-border px-3 py-1.5 rounded-lg shadow-sm">
              <div className="w-6 h-6 rounded-md bg-haas-red/20 border border-haas-red flex items-center justify-center font-mono font-black text-xs text-haas-red shadow-sm shadow-haas-red/30">
                27
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-haas-white flex items-center gap-1.5 leading-none">
                  <span>Nico Hülkenberg</span>
                  <span className="text-[10px] text-haas-gray font-mono bg-[#161622] px-1 rounded">VF-24</span>
                </div>
                <div className="text-[10px] text-haas-gray font-mono mt-0.5">Car #27 • MoneyGram Haas</div>
              </div>

              {/* Interactive Tyre Compound Selector Badge */}
              <div className="flex items-center gap-1 pl-2 border-l border-haas-border/70 ml-1">
                {compounds.map((comp) => {
                  const isCurrent = currentCompound === comp.id;
                  return (
                    <button
                      key={comp.id}
                      onClick={() => onCompoundChange(comp.id)}
                      title={`Select ${comp.label} (${comp.code}) tyre compound`}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-extrabold transition-all ${
                        isCurrent
                          ? `${comp.bg} ${comp.color} shadow-sm ring-1 ring-white/30 scale-105`
                          : 'bg-[#151520] text-haas-gray hover:text-white border border-haas-border'
                      }`}
                    >
                      <span>{comp.id[0]}</span>
                      <span className="text-[8px] opacity-80">{comp.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Engine Status Badge (Online: 17/17 Tests Verified) */}
          <div className="hidden lg:flex items-center gap-2 bg-[#0B0B0E] border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-400"></span>
            <span className="font-semibold text-[11px]">DETERMINISTIC PHYSICS PIPELINE: ONLINE</span>
            <span className="text-[10px] bg-emerald-950/80 px-1.5 py-0.5 rounded text-emerald-300 font-bold border border-emerald-500/30">
              17/17 TESTS VERIFIED
            </span>
          </div>
        </div>

        {/* Center/Right: Microclimate Pill, Selectors & Ablation Drawer Trigger */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-between xl:justify-end">
          
          {/* Microclimate Weather Ribbon */}
          <div className="hidden md:flex items-center gap-2.5 bg-[#0B0B0E] border border-haas-border px-3 py-1 rounded-lg text-xs font-mono text-haas-gray">
            <div className="flex items-center gap-1">
              <span className="text-haas-amber font-bold">42.8°C</span>
              <span className="text-[10px]">Track</span>
            </div>
            <span className="text-haas-border">•</span>
            <div className="flex items-center gap-1">
              <span className="text-haas-white font-bold">28.1°C</span>
              <span className="text-[10px]">Air</span>
            </div>
            <span className="text-haas-border">•</span>
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-haas-cyan" />
              <span className="text-haas-white font-bold">48%</span>
            </div>
            <span className="text-haas-border">•</span>
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-slate-300" />
              <span className="text-haas-white font-bold">2.8 m/s</span>
            </div>
          </div>

          {/* Circuit Dropdown */}
          <div className="flex items-center gap-2 bg-[#0B0B0E] border border-haas-border rounded-lg px-2.5 py-1.5 shadow-sm">
            <Flag className="w-3.5 h-3.5 text-haas-red flex-shrink-0" />
            <select
              value={currentCircuit}
              onChange={(e) => onCircuitChange(e.target.value as CircuitId)}
              className="bg-transparent text-xs font-semibold text-haas-white focus:outline-none cursor-pointer pr-1"
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
          <div className="flex items-center bg-[#0B0B0E] p-1 rounded-lg border border-haas-border shadow-sm">
            {(['FP1', 'FP2', 'FP3', 'Race'] as SessionId[]).map((sess) => {
              const isActive = currentSession === sess;
              return (
                <button
                  key={sess}
                  onClick={() => onSessionChange(sess)}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded transition-all duration-150 ${
                    isActive
                      ? 'bg-haas-red text-white shadow-sm shadow-haas-red/50'
                      : 'text-haas-gray hover:text-haas-white hover:bg-[#15151E]'
                  }`}
                >
                  {sess === 'Race' ? 'Sunday Race (Held-Out)' : sess}
                </button>
              );
            })}
          </div>

          {/* Ablation Settings Drawer Trigger */}
          <button
            onClick={onOpenAblation}
            className="flex items-center gap-1.5 bg-[#0B0B0E] hover:bg-[#181824] text-haas-gray hover:text-haas-white border border-haas-border hover:border-haas-red/50 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
            title="Configure Vehicle Physics & Ablation Parameters"
          >
            <Sliders className="w-3.5 h-3.5 text-haas-red" />
            <span className="hidden sm:inline font-mono font-bold text-haas-white">Ablation Controls</span>
          </button>
        </div>

      </div>
    </header>
  );
};
