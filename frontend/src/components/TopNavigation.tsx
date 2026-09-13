import React, { useState, useEffect } from 'react';
import type { SessionId, TyreCompound } from '../types/telemetry';
import { useTelemetry, type CompoundType, type SessionType } from '../context/TelemetryContext';
import { Map, Activity, Disc, Award, SlidersHorizontal, ChevronRight, Clock, User } from 'lucide-react';

export type WorkspaceTab = 'circuit' | 'decoupling' | 'chassis' | 'validation';

interface TopNavigationProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  currentSession?: SessionId;
  onSessionChange?: (s: SessionId) => void;
  currentCompound?: TyreCompound;
  onCompoundChange?: (c: TyreCompound) => void;
  tyreLifeLaps?: number;
  onOpenPhysicsInspector: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenPhysicsInspector,
}) => {
  const {
    selectedCompound,
    setCompound,
    selectedSession,
    setSession,
    currentLapData,
  } = useTelemetry();

  // Dual live clock state (Track Time in Barcelona CEST vs Local / My Time)
  const [trackTime, setTrackTime] = useState('14:32:45');
  const [sessionSeconds, setSessionSeconds] = useState(2538); // 42m 18s countdown

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTrackTime(now.toTimeString().split(' ')[0]);
      setSessionSeconds((prev) => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdownH = Math.floor(sessionSeconds / 3600);
  const countdownM = Math.floor((sessionSeconds % 3600) / 60);
  const countdownS = sessionSeconds % 60;

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

  const compounds: Array<{ id: CompoundType; code: string; label: string; tooltip: string }> = [
    { id: 'SOFT', code: 'SC3', label: 'SC3', tooltip: 'Soft Compound (C3)' },
    { id: 'MEDIUM', code: 'MC2', label: 'MC2', tooltip: 'Medium Compound (C2)' },
    { id: 'HARD', code: 'HC1', label: 'HC1', tooltip: 'Hard Compound (C1)' },
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

      {/* Tier 1: Primary Navigation Bar with Signature F1 Hazard Texture */}
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
                  VF-26
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

          {/* Right Action Cluster: Quick Compound Switcher, Physics Pill, Profile */}
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

            {/* Profile / Account Icon */}
            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/[0.25] transition-colors cursor-pointer">
              <User className="w-4 h-4" />
            </div>

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

      {/* Tier 2: Slim Secondary Context Bar */}
      <div className="bg-[#14161C] border-t border-white/[0.05] px-4 lg:px-8 py-2 text-xs text-zinc-300 font-sans">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Location Indicator & Session Selector */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-white/[0.06]">
              <span className="text-base leading-none">🇪🇸</span>
              <span className="f1-display text-xs tracking-wider text-white">
                CIRCUIT DE BARCELONA-CATALUNYA
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 font-mono text-[11px]">4.657 KM (14 TURNS)</span>
            </div>

            {/* Session Selector Pill */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.06] rounded-md px-2.5 py-1">
              <span className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-bold">SESSION:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSession(e.target.value as SessionType)}
                className="bg-transparent text-white font-display uppercase tracking-wider font-bold text-xs cursor-pointer focus:outline-none pr-1"
              >
                <option value="Race" className="bg-[#101116] text-white">Sunday Race (Held-Out)</option>
                <option value="FP1" className="bg-[#101116] text-white">FP1 Practice</option>
                <option value="FP2" className="bg-[#101116] text-white">FP2 Practice</option>
                <option value="FP3" className="bg-[#101116] text-white">FP3 Practice</option>
              </select>
            </div>
          </div>

          {/* Right Context Readout: Countdown Timer & Clocks & Tyre Life */}
          <div className="flex items-center gap-3 lg:gap-5 ml-auto flex-wrap">
            
            {/* Live Countdown Timer in F1 Bold Tabular Numbers */}
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.06] px-3 py-1 rounded-md">
              <span className="text-[10px] font-display uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#E10600]" />
                SESSION CLOCK:
              </span>
              <div className="font-mono font-bold text-xs tracking-wider text-white tabular-nums flex items-baseline gap-1">
                <span>{String(countdownH).padStart(2, '0')}</span>
                <span className="text-[9px] text-zinc-500 font-sans">H</span>
                <span>{String(countdownM).padStart(2, '0')}</span>
                <span className="text-[9px] text-zinc-500 font-sans">M</span>
                <span>{String(countdownS).padStart(2, '0')}</span>
                <span className="text-[9px] text-zinc-500 font-sans">S</span>
              </div>
            </div>

            {/* Dual Clock: Track Time vs Local */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono tabular-nums text-zinc-400">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase mr-1 font-sans">TRACK TIME</span>
                <span className="text-zinc-200 font-semibold">{trackTime}</span>
              </div>
              <span className="text-zinc-700">|</span>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase mr-1 font-sans">TYRE LIFE</span>
                <span className="text-[#FF3B30] font-semibold">{currentLapData.tyre_life} LAPS</span>
              </div>
            </div>

            {/* Quick Status Chip */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-display uppercase font-bold tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>PIT WINDOW OPEN</span>
            </div>

          </div>

        </div>
      </div>

    </header>
  );
};

