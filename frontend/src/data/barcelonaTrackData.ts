export interface TurnMarkerData {
  id: number;
  name: string;
  x: number;
  y: number;
  type: 'peak_scrub' | 'heavy_braking' | 'medium' | 'fast_exit';
  lateral_g: number;
  roll_transfer: number; // % to outside
  pitch_bias: number;    // % front
  apex_speed_kmh: number;
  limiting_tyre: 'FL' | 'FR' | 'RL' | 'RR';
  heat_flux_kw: number;
}

// Exactly aligned coordinates along Barcelona's true 14-turn perimeter (viewBox 0 0 1000 600):
export const BARCELONA_TURNS: TurnMarkerData[] = [
  { id: 1,  name: "Elf (T1)",              x: 820, y: 120, type: 'heavy_braking', lateral_g: 2.8, roll_transfer: 68.0, pitch_bias: 68.0, apex_speed_kmh: 138, limiting_tyre: 'FL', heat_flux_kw: 180.2 },
  { id: 2,  name: "T2",                     x: 770, y: 155, type: 'medium',        lateral_g: 2.4, roll_transfer: 62.0, pitch_bias: 45.0, apex_speed_kmh: 155, limiting_tyre: 'FR', heat_flux_kw: 140.0 },
  { id: 3,  name: "Curva Renault (T3)",     x: 860, y: 260, type: 'peak_scrub',    lateral_g: 4.2, roll_transfer: 88.0, pitch_bias: 35.0, apex_speed_kmh: 232, limiting_tyre: 'FL', heat_flux_kw: 215.4 },
  { id: 4,  name: "Repsol (T4)",            x: 680, y: 350, type: 'heavy_braking', lateral_g: 3.4, roll_transfer: 76.0, pitch_bias: 62.0, apex_speed_kmh: 142, limiting_tyre: 'FL', heat_flux_kw: 165.0 },
  { id: 5,  name: "Seat (T5)",              x: 520, y: 380, type: 'medium',        lateral_g: 2.1, roll_transfer: 58.0, pitch_bias: 55.0, apex_speed_kmh: 98,  limiting_tyre: 'FR', heat_flux_kw: 110.5 },
  { id: 6,  name: "T6",                     x: 430, y: 330, type: 'fast_exit',     lateral_g: 2.9, roll_transfer: 70.0, pitch_bias: 40.0, apex_speed_kmh: 185, limiting_tyre: 'FR', heat_flux_kw: 135.0 },
  { id: 7,  name: "T7",                     x: 360, y: 275, type: 'medium',        lateral_g: 2.7, roll_transfer: 65.0, pitch_bias: 48.0, apex_speed_kmh: 160, limiting_tyre: 'FL', heat_flux_kw: 128.0 },
  { id: 8,  name: "T8",                     x: 340, y: 210, type: 'medium',        lateral_g: 2.5, roll_transfer: 63.0, pitch_bias: 42.0, apex_speed_kmh: 175, limiting_tyre: 'FR', heat_flux_kw: 122.0 },
  { id: 9,  name: "Campsa (T9)",            x: 310, y: 110, type: 'peak_scrub',    lateral_g: 4.1, roll_transfer: 86.0, pitch_bias: 35.0, apex_speed_kmh: 245, limiting_tyre: 'FL', heat_flux_kw: 210.0 },
  { id: 10, name: "La Caixa (T10)",         x: 210, y: 300, type: 'heavy_braking', lateral_g: 2.6, roll_transfer: 65.0, pitch_bias: 69.0, apex_speed_kmh: 92,  limiting_tyre: 'FR', heat_flux_kw: 175.0 },
  { id: 11, name: "T11",                    x: 225, y: 380, type: 'medium',        lateral_g: 2.2, roll_transfer: 59.0, pitch_bias: 45.0, apex_speed_kmh: 140, limiting_tyre: 'FL', heat_flux_kw: 115.0 },
  { id: 12, name: "Banc Sabadell (T12)",    x: 275, y: 445, type: 'medium',        lateral_g: 3.1, roll_transfer: 74.0, pitch_bias: 52.0, apex_speed_kmh: 165, limiting_tyre: 'FL', heat_flux_kw: 145.0 },
  { id: 13, name: "T13",                    x: 380, y: 490, type: 'fast_exit',     lateral_g: 3.8, roll_transfer: 82.0, pitch_bias: 38.0, apex_speed_kmh: 210, limiting_tyre: 'FL', heat_flux_kw: 190.0 },
  { id: 14, name: "Curva Catalunya (T14)",  x: 540, y: 490, type: 'fast_exit',     lateral_g: 3.9, roll_transfer: 84.0, pitch_bias: 36.0, apex_speed_kmh: 238, limiting_tyre: 'FL', heat_flux_kw: 198.0 }
];

export const BARCELONA_SECTORS = [
  { id: "S1", x: 860, y: 320, label: "SECTOR 1" },
  { id: "S2", x: 345, y: 160, label: "SECTOR 2" },
  { id: "S3", x: 700, y: 490, label: "FINISH / S3" }
];

export const BARCELONA_SVG_PATH = 
  "M 700,490 L 800,490 C 850,490 870,470 870,420 L 870,180 C 870,120 840,100 810,120 " +
  "C 780,140 760,170 780,210 C 800,250 870,240 870,300 C 870,350 780,360 680,350 " +
  "L 560,370 C 510,380 490,390 470,360 L 410,310 C 380,280 360,250 350,210 " +
  "L 320,130 C 310,95 270,95 260,140 L 210,260 C 190,310 200,350 220,380 " +
  "L 260,430 C 290,470 330,490 380,490 Z";

// Maintain alias for any legacy imports
export type CircuitTurn = TurnMarkerData;
