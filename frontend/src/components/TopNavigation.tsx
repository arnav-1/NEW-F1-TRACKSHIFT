import React from 'react';
import type { CircuitId } from '../types/telemetry';
import { useTelemetry, type CompoundType, type SessionType } from '../context/TelemetryContext';
import { Map, Activity, Disc, Award, SlidersHorizontal, Thermometer, Wind } from 'lucide-react';

export type WorkspaceTab = 'circuit' | 'decoupling' | 'chassis' | 'validation';

interface TopNavigationProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onOpenPhysicsInspector: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenPhysicsInspector,
}) => {
  const {
    selectedCircuit,
    setCircuit,
    selectedSession,
    setSession,
    selectedCompound,
    setCompound,
    currentLap,
    totalStintLaps,
    activeCircuitInfo,
    activeSessionWeather,
  } = useTelemetry();

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'circuit', label: 'Circuit & Live Telemetry', icon: Map },
    { id: 'decoupling', label: 'Signal Decoupling', icon: Activity },
    { id: 'chassis', label: '4-Wheel Tyre State', icon: Disc },
    { id: 'validation', label: 'Post-Race Validation', icon: Award },
  ];

  const getCompoundBadgeStyle = (comp: CompoundType) => {
    switch (comp) {
      case 'SOFT':
        return 'bg-[#E10600] text-white border-[#E10600] shadow-[0_0_10px_rgba(225,6,0,0.5)] font-bold';
      case 'MEDIUM':
        return 'bg-[#E5A823] text-black border-[#E5A823] shadow-[0_0_10px_rgba(229,168,35,0.4)] font-bold';
      case 'HARD':
        return 'bg-[#FFFFFF] text-black border-[#FFFFFF] shadow-[0_0_10px_rgba(255,255,255,0.4)] font-bold';
    }
  };

  const compounds: Array<{ id: CompoundType; label: string }> = [
    { id: 'SOFT', label: 'SC3' },
    { id: 'MEDIUM', label: 'MC2' },
    { id: 'HARD', label: 'HC1' },
  ];

  const circuits: Array<{ id: CircuitId; label: string; flag: string; country: string }> = [
    { id: 'spain', label: 'Barcelona-Catalunya', flag: '🇪🇸', country: 'Spain' },
    { id: 'silverstone', label: 'Silverstone Circuit', flag: '🇬🇧', country: 'Great Britain' },
    { id: 'austria', label: 'Red Bull Ring (Spielberg)', flag: '🇦🇹', country: 'Austria' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] shadow-2xl bg-[#0A0A0C]">
      
      {/* Tier 0: Slim Top Utility Bar */}
      <div className="bg-[#070709] border-b border-white/[0.06] px-4 lg:px-8 py-1.5 text-[11px] text-zinc-400">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display uppercase tracking-widest text-[#E10600] font-bold text-xs">
              F1® TRACKSHIFT
            </span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline text-zinc-300 font-sans tracking-wide">
              FIA Formula 1 World Championship™ Pit-Wall Engineering
            </span>
            <span className="hidden md:inline text-zinc-600">|</span>
            <span className="hidden md:inline text-zinc-400">
              Official Technical Partnership: <strong className="text-zinc-200">Toyota Gazoo Racing</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 bg-white/[0.03] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE TELEMETRY STREAM</span>
            </div>
            <div className="flex items-center gap-1 font-display tracking-wider uppercase text-[11px] text-zinc-300 bg-zinc-900 border border-white/[0.1] px-2.5 py-0.5 rounded-full">
              <span className="text-[#E10600] font-bold">#27</span>
              <span>HÜLKENBERG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 1: Primary Navigation Bar with F1 Red Accent */}
      <div className="f1-hazard-pattern bg-[#101116]/95 backdrop-blur-md px-4 lg:px-8 py-0">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between min-h-[58px]">
          
          {/* F1 Team Identity Brand Block */}
          <div className="flex items-center gap-4 py-2 shrink-0">
            <img
              src="/haas-logo.png"
              alt="Haas F1 Team Logo"
              className="h-9 w-auto object-contain shrink-0 filter brightness-105 contrast-110 drop-shadow-md"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] font-display tracking-wider uppercase leading-tight text-zinc-400">
                <span className="text-[#E10600] font-bold">TOYOTA GAZOO RACING</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-300">HAAS F1</span>
              </div>
              <div className="f1-display text-base tracking-wider text-white leading-none flex items-center gap-2">
                <span>PIT-WALL CONSOLE</span>
                <span className="text-[10px] not-italic font-mono font-medium px-2 py-0.5 rounded-full bg-[#E10600]/15 text-[#FF3B30] border border-[#E10600]/30 tracking-normal">
                  VF-24
                </span>
              </div>
            </div>
          </div>

          {/* F1 Main Nav Links with Red Underline Active Indicator */}
          <nav className="hidden md:flex items-center h-[58px] gap-1 lg:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex items-center gap-2 h-[58px] px-3.5 lg:px-4 text-xs lg:text-sm font-display uppercase tracking-wider transition-colors select-none ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-100 font-semibold'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E10600]' : 'text-zinc-500'}`} />
                  <span>{tab.label}</span>
                  
                  {/* Official F1 Red Underline */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#E10600] shadow-[0_0_8px_rgba(225,6,0,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Cluster: Quick Compound Switcher & Physics Pill */}
          <div className="flex items-center gap-2.5 shrink-0 py-2">
            
            {/* Quick Compound Switcher Pills */}
            <div className="flex items-center gap-1 bg-[#0A0A0C] border border-white/[0.08] p-1 rounded-full">
              {compounds.map((comp) => {
                const isCurrent = selectedCompound === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setCompound(comp.id)}
                    title={`Switch compound to ${comp.label}`}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase font-bold tracking-wider transition-all ${
                      isCurrent
                        ? getCompoundBadgeStyle(comp.id)
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {comp.label}
                  </button>
                );
              })}
            </div>

            {/* F1 Official Red Pill Button: Physics Specs */}
            <button
              onClick={onOpenPhysicsInspector}
              className="f1-pill flex items-center gap-1.5 bg-[#E10600] hover:bg-[#B30500] text-white px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all shadow-md shadow-red-950/40 hover:scale-[1.02] active:scale-[0.98]"
              title="Open TrackShift Physics & Vehicle Ablation Model"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden sm:inline">PHYSICS SPECS</span>
            </button>

          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-between border-t border-white/[0.06] py-1 overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-display uppercase tracking-wider whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-white font-bold border-b-2 border-[#E10600]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Tier 2: Real Pit-Wall Telemetry Context Bar */}
      <div className="bg-[#14161C] border-t border-white/[0.05] px-4 lg:px-8 py-2 text-xs text-zinc-300 font-sans">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Circuit & Session Selectors */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* 3-Track Benchmark Selector */}
            <div className="flex items-center gap-2 bg-black/50 border border-white/[0.08] px-2.5 py-1 rounded-md">
              <span className="text-[10px] font-display uppercase tracking-wider text-zinc-400 font-bold">CIRCUIT:</span>
              <div className="flex items-center gap-1">
                {circuits.map((c) => {
                  const isSelected = selectedCircuit === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCircuit(c.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-display uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#E10600] text-white font-bold shadow-[0_0_8px_rgba(225,6,0,0.4)]'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.country}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session Selector */}
            <div className="flex items-center gap-1.5 bg-black/50 border border-white/[0.08] rounded-md px-2.5 py-1">
              <span className="text-[10px] font-display uppercase tracking-wider text-zinc-400 font-bold">SESSION:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSession(e.target.value as SessionType)}
                className="bg-transparent text-white font-display uppercase tracking-wider font-bold text-xs cursor-pointer focus:outline-none pr-1"
              >
                <option value="Race" className="bg-[#101116] text-white">Sunday Race (Held-Out)</option>
                <option value="FP1" className="bg-[#101116] text-white">FP1 Practice (Green Track)</option>
                <option value="FP2" className="bg-[#101116] text-white">FP2 Practice (Long Run)</option>
                <option value="FP3" className="bg-[#101116] text-white">FP3 Practice (Quali Sim)</option>
              </select>
            </div>

            {/* Circuit Limiting Spec Pill */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono bg-white/[0.02] border border-white/[0.06] px-2.5 py-1 rounded-md">
              <span className="text-zinc-500 font-sans">LIMITING:</span>
              <span className="text-red-400 font-bold">{activeCircuitInfo.limiting_wheel_name}</span>
            </div>

          </div>

          {/* Right Context Readout: Authentic Track Telemetry (No Gimmick Clocks) */}
          <div className="flex items-center gap-3 lg:gap-5 ml-auto flex-wrap">
            
            {/* Real Track & Ambient Temperature */}
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.06] px-3 py-1 rounded-md font-mono text-[11px]">
              <Thermometer className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <div className="flex items-center gap-2">
                <span>
                  <span className="text-zinc-500 font-sans text-[10px] mr-1">TRACK</span>
                  <strong className="text-white tabular-nums">{activeSessionWeather.track_temp_c.toFixed(1)}°C</strong>
                </span>
                <span className="text-zinc-700">|</span>
                <span>
                  <span className="text-zinc-500 font-sans text-[10px] mr-1">AIR</span>
                  <span className="text-zinc-300 tabular-nums">{activeSessionWeather.air_temp_c.toFixed(1)}°C</span>
                </span>
              </div>
            </div>

            {/* Weather Condition */}
            <div className="hidden sm:flex items-center gap-1.5 bg-black/40 border border-white/[0.06] px-2.5 py-1 rounded-md text-[11px] text-zinc-300 font-mono">
              <Wind className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{activeSessionWeather.condition}</span>
            </div>

            {/* Stint Lap Progress */}
            <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums bg-black/40 border border-white/[0.06] px-2.5 py-1 rounded-md">
              <span className="text-[10px] text-zinc-500 uppercase font-sans">STINT PROGRESS</span>
              <span className="text-[#FF3B30] font-bold">LAP {currentLap} / {totalStintLaps}</span>
            </div>

            {/* Pit Window Status Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-display uppercase font-bold tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentLap >= 14 && currentLap <= 25 ? 'PIT WINDOW OPEN' : 'STINT ACTIVE'}</span>
            </div>

          </div>

        </div>
      </div>

    </header>
  );
};
