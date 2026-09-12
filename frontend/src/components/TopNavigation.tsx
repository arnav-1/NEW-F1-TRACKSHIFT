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
        return 'bg-[#E10600] text-white border-[#E10600] shadow-sm shadow-red-500/40';
      case 'MEDIUM':
        return 'bg-[#E5A823] text-black border-[#E5A823] font-bold shadow-sm shadow-yellow-500/30';
      case 'HARD':
        return 'bg-white text-black border-white font-bold shadow-sm';
    }
  };

  const compounds: Array<{ id: CompoundType; code: string; label: string }> = [
    { id: 'SOFT', code: 'C3', label: 'SC3' },
    { id: 'MEDIUM', code: 'C2', label: 'MC2' },
    { id: 'HARD', code: 'C1', label: 'HC1' },
  ];

  return (
    <header className="bg-[#101018]/95 backdrop-blur-md border-b border-[#242432] sticky top-0 z-40 px-4 lg:px-8 py-2.5 shadow-2xl">
      <div className="max-w-[1800px] mx-auto space-y-2.5">
        
        {/* Tier 1: Master Brand & Driver / Vehicle Status Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-[#1E1E2C] pb-2.5">
          
          {/* Haas & TGR Brand Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <img
                src="/haas-logo.png"
                alt="Haas F1 Team Logo"
                className="h-9 w-auto object-contain shrink-0 drop-shadow"
              />
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8C8C9A] leading-none mb-0.5">
                  <span className="text-[#E10600]">Toyota Gazoo Racing</span>
                  <span className="text-[#333345]">|</span>
                  <span>Partnership</span>
                </div>
                <div className="text-base font-bold text-[#F5F5F7] flex items-center gap-2 leading-none">
                  <span>TGR | Haas F1 Team</span>
                  <span className="text-[10px] bg-[#E10600]/20 text-[#E10600] px-2 py-0.5 rounded font-mono font-bold border border-[#E10600]/30">
                    TrackShift Pit-Wall
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Identity & Quick Compound Switcher & Physics Specs */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-3 bg-[#151520] border border-[#242432] px-3.5 py-1.5 rounded-lg shadow-sm">
              <div className="w-6 h-6 rounded bg-[#E10600]/20 border border-[#E10600] text-[#E10600] flex items-center justify-center font-mono font-black text-xs">
                27
              </div>
              <div>
                <div className="text-xs font-black text-[#F5F5F7] flex items-center gap-1.5">
                  <span>Nico Hülkenberg</span>
                  <span className="text-[10px] text-[#8C8C9A] font-mono bg-[#1E1E2C] px-1.5 py-0.2 rounded border border-[#242432]">
                    VF-26
                  </span>
                </div>
                <div className="text-[10px] text-[#8C8C9A] font-mono">
                  Car #27 | MoneyGram TGR Haas
                </div>
              </div>

              {/* Current Tyre Badge & Quick Compound Switcher */}
              <div className="flex items-center gap-1 pl-2.5 border-l border-[#242432]">
                {compounds.map((comp) => {
                  const isCurrent = selectedCompound === comp.id;
                  return (
                    <button
                      key={comp.id}
                      onClick={() => setCompound(comp.id)}
                      title={`Select ${comp.id} (${comp.code})`}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                        isCurrent
                          ? `${getCompoundStyle(comp.id)} font-bold ring-1 ring-white/20 scale-105`
                          : 'bg-[#101018] text-[#8C8C9A] border-[#242432] hover:text-white hover:bg-[#181824]'
                      }`}
                    >
                      <span>{comp.label}</span>
                    </button>
                  );
                })}
                <span className="text-[10px] text-[#8C8C9A] font-mono ml-1 font-semibold">
                  (Life: {currentLapData.tyre_life} L)
                </span>
              </div>
            </div>

            <button
              onClick={onOpenPhysicsInspector}
              className="flex items-center gap-1.5 bg-[#151520] hover:bg-[#1C1C2B] text-[#F5F5F7] border border-[#242432] hover:border-[#E10600] px-3 py-2 rounded-lg text-xs font-mono font-semibold shrink-0 transition-colors"
              title="Inspect Physics Parameters & Vehicle Assumptions"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#E10600]" />
              <span className="hidden sm:inline">Physics Specs</span>
            </button>
          </div>

        </div>

        {/* Tier 2: Circuit Context & Telemetry Workspace Ribbon */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          
          {/* Track & Session Selector */}
          <div className="flex items-center gap-2.5 bg-[#151520] border border-[#242432] rounded-lg px-3 py-1.5 text-xs font-mono w-full lg:w-auto justify-between lg:justify-start">
            <span className="font-bold text-[#F5F5F7]">Circuit de Barcelona-Catalunya</span>
            <span className="text-[#333345]">|</span>
            <span className="text-[#8C8C9A]">4.657 km (14 Turns)</span>
            <span className="text-[#333345]">|</span>
            <select
              value={selectedSession}
              onChange={(e) => setSession(e.target.value as SessionType)}
              className="bg-[#101018] border border-[#242432] text-white rounded px-2.5 py-0.5 text-xs font-bold cursor-pointer focus:outline-none focus:border-[#E10600]"
            >
              <option value="Race">Sunday Race (Held-Out)</option>
              <option value="FP1">FP1 Free Practice</option>
              <option value="FP2">FP2 Free Practice</option>
              <option value="FP3">FP3 Free Practice</option>
            </select>
          </div>

          {/* 4 Dedicated Workspace Tabs */}
          <div className="flex items-center bg-[#0B0B0E] p-1 rounded-xl border border-[#242432] shadow-inner w-full lg:w-auto justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E10600] text-white font-bold shadow-sm shadow-red-500/20'
                      : 'text-[#8C8C9A] hover:text-[#F5F5F7] hover:bg-[#181824]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8C8C9A]'}`} />
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
