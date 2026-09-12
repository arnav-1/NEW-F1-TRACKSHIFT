import React from 'react';
import type { SessionId, TyreCompound } from '../types/telemetry';
import { useTelemetry, type CompoundType, type SessionType } from '../context/TelemetryContext';
import { Map, Activity, Disc, Award, SlidersHorizontal } from 'lucide-react';

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

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'circuit', label: 'Circuit & Live Telemetry', icon: Map },
    { id: 'decoupling', label: 'Signal Decoupling', icon: Activity },
    { id: 'chassis', label: '4-Wheel Tyre State', icon: Disc },
    { id: 'validation', label: 'Post-Race Validation', icon: Award },
  ];

  const getCompoundStyle = (comp: CompoundType) => {
    switch (comp) {
      case 'SOFT':
        return 'bg-[#E10600] text-white border-transparent shadow-sm shadow-red-900/30';
      case 'MEDIUM':
        return 'bg-[#E5A823] text-black border-transparent font-semibold shadow-sm shadow-amber-900/20';
      case 'HARD':
        return 'bg-zinc-100 text-zinc-950 border-transparent font-semibold shadow-sm';
    }
  };

  const compounds: Array<{ id: CompoundType; code: string; label: string }> = [
    { id: 'SOFT', code: 'C3', label: 'SC3' },
    { id: 'MEDIUM', code: 'C2', label: 'MC2' },
    { id: 'HARD', code: 'C1', label: 'HC1' },
  ];

  return (
    <header className="bg-[#101319]/95 backdrop-blur-md border-b border-white/[0.07] sticky top-0 z-40 px-4 lg:px-8 py-2.5 shadow-lg">
      <div className="max-w-[1800px] mx-auto space-y-2.5">
        
        {/* Tier 1: Master Brand & Driver / Vehicle Status Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-white/[0.06] pb-2.5">
          
          {/* Haas & TGR Brand Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <img
                src="/haas-logo.png"
                alt="Haas F1 Team Logo"
                className="h-8 w-auto object-contain shrink-0 drop-shadow"
              />
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 tracking-wider uppercase leading-none mb-1">
                  <span className="text-[#E10600] font-semibold">Toyota Gazoo Racing</span>
                  <span className="text-zinc-600">|</span>
                  <span>Partnership</span>
                </div>
                <div className="text-sm font-bold text-zinc-100 flex items-center gap-2 leading-none">
                  <span>TGR | Haas F1 Team</span>
                  <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-sans font-medium border border-red-500/20">
                    TrackShift Pit-Wall
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Identity & Quick Compound Switcher & Physics Specs */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-3 bg-[#14171F] border border-white/[0.07] px-3 py-1.5 rounded-lg shadow-sm">
              <div className="w-6 h-6 rounded bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center font-mono font-bold text-xs">
                27
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 leading-tight">
                  <span>Nico Hülkenberg</span>
                  <span className="text-[9px] text-zinc-400 font-mono bg-white/[0.05] px-1 py-0.2 rounded border border-white/[0.08]">
                    VF-26
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 leading-tight">
                  Car #27 | Toyota Gazoo Racing Haas
                </div>
              </div>

              {/* Current Tyre Badge & Quick Compound Switcher */}
              <div className="flex items-center gap-1 pl-2.5 border-l border-white/[0.08]">
                {compounds.map((comp) => {
                  const isCurrent = selectedCompound === comp.id;
                  return (
                    <button
                      key={comp.id}
                      onClick={() => setCompound(comp.id)}
                      title={`Select ${comp.id} (${comp.code})`}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                        isCurrent
                          ? `${getCompoundStyle(comp.id)} ring-1 ring-white/20`
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{comp.label}</span>
                    </button>
                  );
                })}
                <span className="text-[10px] text-zinc-400 font-mono ml-1 tabular-nums font-medium">
                  (Life: {currentLapData.tyre_life} L)
                </span>
              </div>
            </div>

            <button
              onClick={onOpenPhysicsInspector}
              className="flex items-center gap-1.5 bg-[#14171F] hover:bg-[#1A1E27] text-zinc-200 border border-white/[0.07] hover:border-white/[0.15] px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-all shadow-sm"
              title="Inspect Physics Parameters & Vehicle Assumptions"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Physics Specs</span>
            </button>
          </div>

        </div>

        {/* Tier 2: Circuit Context & Telemetry Workspace Ribbon */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          
          {/* Track & Session Selector */}
          <div className="flex items-center gap-2.5 bg-[#14171F] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs w-full lg:w-auto justify-between lg:justify-start shadow-sm">
            <span className="font-semibold text-zinc-200">Circuit de Barcelona-Catalunya</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 text-[11px]">4.657 km (14 Turns)</span>
            <span className="text-zinc-600">|</span>
            <select
              value={selectedSession}
              onChange={(e) => setSession(e.target.value as SessionType)}
              className="bg-[#0B0D11] border border-white/[0.08] text-zinc-200 rounded px-2.5 py-0.5 text-xs font-medium cursor-pointer focus:outline-none focus:border-red-500/50"
            >
              <option value="Race">Sunday Race (Held-Out)</option>
              <option value="FP1">FP1 Free Practice</option>
              <option value="FP2">FP2 Free Practice</option>
              <option value="FP3">FP3 Free Practice</option>
            </select>
          </div>

          {/* 4 Dedicated Workspace Tabs: Segmented Control Pattern */}
          <div className="flex items-center bg-[#0B0D11] p-1 rounded-lg border border-white/[0.07] w-full lg:w-auto justify-center gap-1 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1B1F2A] text-zinc-100 font-semibold shadow-sm border border-white/[0.1]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-400' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </header>
  );
};
