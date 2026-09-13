import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type {
  LapTelemetryRecord,
  CompoundTelemetryData,
  BenchmarkRecord,
  TelemetryExportSchema,
  AblationConfig,
  PostRaceValidationData,
} from '../types/telemetry';
import rawTelemetryExport from '../data/telemetry_export.json';

export type CompoundType = 'SOFT' | 'MEDIUM' | 'HARD';
export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Race';

export interface TelemetryContextType {
  selectedCircuit: string;
  selectedSession: SessionType;
  selectedCompound: CompoundType;
  currentLapIndex: number;
  currentLap: number;
  totalStintLaps: number;
  isPlaying: boolean;
  activeTurn: number | null;
  setCompound: (c: CompoundType) => void;
  setSession: (s: SessionType) => void;
  setLapIndex: (idx: number) => void;
  setLap: (lap: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveTurn: (turn: number | null) => void;
  currentLapData: LapTelemetryRecord;
  stintDataset: LapTelemetryRecord[];
  compoundMetadata: {
    stint_number: number;
    total_laps: number;
    limiting_corner: string;
    limiting_workload_pct: number;
    fitted_alpha: number;
    fitted_beta: number;
    predicted_cliff_lap: number;
  };
  benchmarks: BenchmarkRecord[];
  postRaceValidation?: PostRaceValidationData;
  ablationConfig: AblationConfig;
  setAblationConfig: (config: AblationConfig) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

// Cast exported JSON data cleanly to schema
const telemetryData = rawTelemetryExport as unknown as TelemetryExportSchema;

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCircuit] = useState<string>(telemetryData.circuit || 'Circuit de Barcelona-Catalunya');
  const [selectedSession, setSelectedSession] = useState<SessionType>('FP2');
  const [selectedCompound, setSelectedCompound] = useState<CompoundType>('SOFT');
  const [currentLapIndex, setCurrentLapIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTurn, setActiveTurn] = useState<number | null>(3); // Default Turn 3 (Curva Renault)

  const [ablationConfig, setAblationConfig] = useState<AblationConfig>({
    aeroDeficit: 0.88,
    massSquaredScaling: true,
    paceManagementPush: 0.94,
  });

  // Extract active compound object for the selected session
  const activeCompoundData: CompoundTelemetryData = useMemo(() => {
    const sessionObj = telemetryData.sessions?.[selectedSession] || telemetryData.sessions?.['FP2'];
    const compoundObj = sessionObj?.compounds?.[selectedCompound] || sessionObj?.compounds?.['SOFT'];
    if (compoundObj && Array.isArray(compoundObj.laps) && compoundObj.laps.length > 0) {
      return compoundObj;
    }
    // Fallback if data is unexpectedly missing
    const fallback = telemetryData.sessions?.['FP2']?.compounds?.['SOFT'];
    return fallback;
  }, [selectedSession, selectedCompound]);

  const stintDataset: LapTelemetryRecord[] = useMemo(() => {
    return activeCompoundData?.laps || [];
  }, [activeCompoundData]);

  const totalStintLaps = stintDataset.length;

  // Ensure currentLapIndex stays strictly within valid bounds [0, totalStintLaps - 1]
  const safeLapIndex = Math.max(0, Math.min(currentLapIndex, Math.max(0, totalStintLaps - 1)));
  const currentLap = safeLapIndex + 1;
  const currentLapData: LapTelemetryRecord = stintDataset[safeLapIndex] || stintDataset[0];

  const compoundMetadata = useMemo(() => ({
    stint_number: activeCompoundData?.stint_number ?? 1,
    total_laps: activeCompoundData?.total_laps ?? totalStintLaps,
    limiting_corner: activeCompoundData?.limiting_corner ?? 'FL',
    limiting_workload_pct: activeCompoundData?.limiting_workload_pct ?? 36.2,
    fitted_alpha: activeCompoundData?.fitted_alpha ?? 0.2359,
    fitted_beta: activeCompoundData?.fitted_beta ?? 0.0031,
    predicted_cliff_lap: activeCompoundData?.predicted_cliff_lap ?? 19.4,
  }), [activeCompoundData, totalStintLaps]);

  // Action dispatchers: resets lap index when compound or session changes
  const handleSetCompound = (c: CompoundType) => {
    setSelectedCompound(c);
    setCurrentLapIndex(0);
  };

  const handleSetSession = (s: SessionType) => {
    setSelectedSession(s);
    setCurrentLapIndex(0);
  };

  const handleSetLapIndex = (idx: number) => {
    setCurrentLapIndex(Math.max(0, Math.min(idx, totalStintLaps - 1)));
  };

  const handleSetLap = (lap: number) => {
    handleSetLapIndex(lap - 1);
  };

  // Playback timer advances lap automatically every 1.5 seconds
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentLapIndex((prev) => {
          if (prev >= totalStintLaps - 1) return 0;
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
    currentLapIndex: safeLapIndex,
    currentLap,
    totalStintLaps,
    isPlaying,
    activeTurn,
    setCompound: handleSetCompound,
    setSession: handleSetSession,
    setLapIndex: handleSetLapIndex,
    setLap: handleSetLap,
    setIsPlaying,
    setActiveTurn,
    currentLapData,
    stintDataset,
    compoundMetadata,
    benchmarks: telemetryData.benchmarks || [],
    postRaceValidation: telemetryData.post_race_validation,
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
