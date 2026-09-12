import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { LapTelemetryRecord, SessionId, TyreCompound, AblationConfig } from '../types/telemetry';
import { generateLapTelemetry } from '../data/mockTelemetry';

export type CompoundType = 'SOFT' | 'MEDIUM' | 'HARD';
export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Race';

export interface TelemetryContextType {
  selectedCircuit: string;
  selectedSession: SessionType;
  selectedCompound: CompoundType;
  currentLap: number;
  totalStintLaps: number;
  isPlaying: boolean;
  activeTurn: number | null;
  setCompound: (c: CompoundType) => void;
  setSession: (s: SessionType) => void;
  setLap: (lap: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveTurn: (turn: number | null) => void;
  currentLapData: LapTelemetryRecord;
  stintDataset: LapTelemetryRecord[];
  ablationConfig: AblationConfig;
  setAblationConfig: (config: AblationConfig) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCircuit] = useState<string>('barcelona');
  const [selectedSession, setSelectedSession] = useState<SessionType>('FP2');
  const [selectedCompound, setSelectedCompound] = useState<CompoundType>('SOFT');
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTurn, setActiveTurn] = useState<number | null>(3); // Default Turn 3 (Curva Renault)

  const [ablationConfig, setAblationConfig] = useState<AblationConfig>({
    aeroDeficit: 0.88,
    massSquaredScaling: true,
    paceManagementPush: 0.94,
  });

  // Recalculate stint dataset dynamically whenever session, compound, or physics ablation changes
  const stintDataset = useMemo(() => {
    return generateLapTelemetry(
      'barcelona',
      selectedSession as SessionId,
      selectedCompound as TyreCompound,
      ablationConfig.aeroDeficit,
      ablationConfig.massSquaredScaling,
      ablationConfig.paceManagementPush
    );
  }, [selectedSession, selectedCompound, ablationConfig]);

  const totalStintLaps = stintDataset.length;

  // Ensure currentLap stays within valid bounds [1, totalStintLaps]
  const safeLap = Math.max(1, Math.min(currentLap, totalStintLaps));
  const currentLapData = stintDataset[safeLap - 1] || stintDataset[0];

  // When compound or session changes, reset to lap 1 to prevent out-of-bounds
  const handleSetCompound = (c: CompoundType) => {
    setSelectedCompound(c);
    setCurrentLap(1);
  };

  const handleSetSession = (s: SessionType) => {
    setSelectedSession(s);
    setCurrentLap(1);
  };

  // Playback timer advances lap automatically every 1.5 seconds
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentLap((prev) => {
          if (prev >= totalStintLaps) return 1;
          return prev + 1;
        });
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, totalStintLaps]);

  const value: TelemetryContextType = {
    selectedCircuit,
    selectedSession,
    selectedCompound,
    currentLap: safeLap,
    totalStintLaps,
    isPlaying,
    activeTurn,
    setCompound: handleSetCompound,
    setSession: handleSetSession,
    setLap: setCurrentLap,
    setIsPlaying,
    setActiveTurn,
    currentLapData,
    stintDataset,
    ablationConfig,
    setAblationConfig,
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
};

export function useTelemetry(): TelemetryContextType {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}
