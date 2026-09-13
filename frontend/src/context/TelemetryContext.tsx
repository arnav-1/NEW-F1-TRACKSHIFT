import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type {
  LapTelemetryRecord,
  CompoundTelemetryData,
  BenchmarkRecord,
  TelemetryExportSchema,
  AblationConfig,
  PostRaceValidationData,
  CircuitId,
  WheelId,
  CircuitInfo,
  SessionWeather,
  SessionRecommendation,
} from '../types/telemetry';
import rawTelemetryExport from '../data/telemetry_export.json';
import { CIRCUITS_GEOMETRY } from '../data/circuitsData';

export type CompoundType = 'SOFT' | 'MEDIUM' | 'HARD';
export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Race';

export interface TelemetryContextType {
  selectedCircuit: CircuitId;
  selectedSession: SessionType;
  selectedCompound: CompoundType;
  selectedWheel: WheelId;
  currentLapIndex: number;
  currentLap: number;
  totalStintLaps: number;
  isPlaying: boolean;
  activeTurn: number | null;
  activeCircuitInfo: CircuitInfo;
  activeSessionWeather: SessionWeather;
  setCircuit: (c: CircuitId) => void;
  setSession: (s: SessionType) => void;
  setCompound: (c: CompoundType) => void;
  setSelectedWheel: (w: WheelId) => void;
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
  activeSessionRecommendation?: SessionRecommendation;
  ablationConfig: AblationConfig;
  setAblationConfig: (config: AblationConfig) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

// Cast exported JSON data cleanly to schema
const telemetryData = rawTelemetryExport as unknown as TelemetryExportSchema;

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCircuit, setSelectedCircuit] = useState<CircuitId>('spain');
  const [selectedSession, setSelectedSession] = useState<SessionType>('Race');
  const [selectedCompound, setSelectedCompound] = useState<CompoundType>('SOFT');
  const [selectedWheel, setSelectedWheel] = useState<WheelId>('FL');
  const [currentLapIndex, setCurrentLapIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTurn, setActiveTurn] = useState<number | null>(3);

  const [ablationConfig, setAblationConfig] = useState<AblationConfig>({
    aeroDeficit: 0.88,
    massSquaredScaling: true,
    paceManagementPush: 0.94,
  });

  // Circuit Info
  const activeCircuitInfo: CircuitInfo = useMemo(() => {
    const exportedCircuit = telemetryData.circuits?.[selectedCircuit]?.circuit_info;
    if (exportedCircuit) return exportedCircuit;
    const geom = CIRCUITS_GEOMETRY[selectedCircuit];
    return {
      id: selectedCircuit,
      name: geom.name,
      country: geom.country,
      flag: geom.flag,
      length_km: geom.length_km,
      turns: geom.turns_count,
      limiting_wheel: geom.limiting_wheel,
      limiting_wheel_name: geom.limiting_wheel_name,
      archetype: geom.archetype,
    };
  }, [selectedCircuit]);

  // Session Weather
  const activeSessionWeather: SessionWeather = useMemo(() => {
    const circuitEntry = telemetryData.circuits?.[selectedCircuit];
    const sessionObj = circuitEntry?.sessions?.[selectedSession] || telemetryData.sessions?.[selectedSession];
    if (sessionObj?.weather) {
      return sessionObj.weather;
    }
    // Realistic fallback based on circuit & session
    const baseTrackTemp = selectedCircuit === 'spain' ? 44.5 : selectedCircuit === 'silverstone' ? 34.2 : 46.8;
    const baseAirTemp = selectedCircuit === 'spain' ? 29.2 : selectedCircuit === 'silverstone' ? 22.8 : 28.5;
    const sessionDelta = selectedSession === 'FP1' ? -4.5 : selectedSession === 'FP2' ? 2.0 : selectedSession === 'FP3' ? -1.0 : 3.5;
    return {
      track_temp_c: Number((baseTrackTemp + sessionDelta).toFixed(1)),
      air_temp_c: Number((baseAirTemp + sessionDelta * 0.4).toFixed(1)),
      humidity_pct: 48.0,
      wind_speed_kmh: 12.4,
      condition: selectedCircuit === 'silverstone' ? 'Dry / Gusty Winds' : 'Dry / Clear Sky',
    };
  }, [selectedCircuit, selectedSession]);

  // Extract active compound object for the selected circuit, session, and compound
  const activeCompoundData: CompoundTelemetryData = useMemo(() => {
    const circuitEntry = telemetryData.circuits?.[selectedCircuit];
    const sessionObj = circuitEntry?.sessions?.[selectedSession] || telemetryData.sessions?.[selectedSession];
    const compoundObj = sessionObj?.compounds?.[selectedCompound] || sessionObj?.compounds?.['SOFT'];
    if (compoundObj && Array.isArray(compoundObj.laps) && compoundObj.laps.length > 0) {
      return compoundObj;
    }
    // Fallback if data is unexpectedly missing
    const fallback = telemetryData.sessions?.['FP2']?.compounds?.['SOFT'];
    return fallback;
  }, [selectedCircuit, selectedSession, selectedCompound]);

  const activeSessionRecommendation: SessionRecommendation | undefined = useMemo(() => {
    const circuitEntry = telemetryData.circuits?.[selectedCircuit];
    const sessionObj = circuitEntry?.sessions?.[selectedSession] || telemetryData.sessions?.[selectedSession];
    return sessionObj?.recommendation;
  }, [selectedCircuit, selectedSession]);

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
    limiting_corner: activeCompoundData?.limiting_corner ?? activeCircuitInfo.limiting_wheel,
    limiting_workload_pct: activeCompoundData?.limiting_workload_pct ?? (selectedCircuit === 'austria' ? 29.5 : 36.2),
    fitted_alpha: activeCompoundData?.fitted_alpha ?? 0.2359,
    fitted_beta: activeCompoundData?.fitted_beta ?? 0.0031,
    predicted_cliff_lap: activeCompoundData?.predicted_cliff_lap ?? (selectedCompound === 'SOFT' ? 19.4 : selectedCompound === 'MEDIUM' ? 28.0 : 38.0),
  }), [activeCompoundData, totalStintLaps, activeCircuitInfo, selectedCircuit, selectedCompound]);

  // Circuit switcher dispatcher
  const handleSetCircuit = (c: CircuitId) => {
    setSelectedCircuit(c);
    setCurrentLapIndex(0);
    // Adjust active turn if out of bounds for the selected circuit
    const maxTurns = CIRCUITS_GEOMETRY[c]?.turns_count ?? 10;
    if (activeTurn === null || activeTurn > maxTurns) {
      setActiveTurn(Math.min(3, maxTurns));
    }
  };

  // Session switcher dispatcher
  const handleSetSession = (s: SessionType) => {
    setSelectedSession(s);
    setCurrentLapIndex(0);
  };

  // Compound switcher dispatcher
  const handleSetCompound = (c: CompoundType) => {
    setSelectedCompound(c);
    setCurrentLapIndex(0);
  };

  // Wheel corner switcher dispatcher
  const handleSetSelectedWheel = (w: WheelId) => {
    setSelectedWheel(w);
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
    selectedWheel,
    currentLapIndex: safeLapIndex,
    currentLap,
    totalStintLaps,
    isPlaying,
    activeTurn,
    activeCircuitInfo,
    activeSessionWeather,
    setCircuit: handleSetCircuit,
    setSession: handleSetSession,
    setCompound: handleSetCompound,
    setSelectedWheel: handleSetSelectedWheel,
    setLapIndex: handleSetLapIndex,
    setLap: handleSetLap,
    setIsPlaying,
    setActiveTurn,
    currentLapData,
    stintDataset,
    compoundMetadata,
    benchmarks: telemetryData.benchmarks || [],
    postRaceValidation: telemetryData.post_race_validation,
    activeSessionRecommendation,
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
