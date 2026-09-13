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

export interface SectorMarkerData {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface CircuitMapGeometry {
  circuitId: 'spain' | 'silverstone' | 'austria' | 'belgium';
  name: string;
  country: string;
  flag: string;
  length_km: number;
  turns_count: number;
  limiting_wheel: 'FL' | 'FR' | 'RL' | 'RR';
  limiting_wheel_name: string;
  archetype: string;
  svgPath: string;
  turns: TurnMarkerData[];
  sectors: SectorMarkerData[];
  viewBox: string;
  peakScrubLabel: string;
  heavyBrakingLabel: string;
}

// 1. SPAIN (Circuit de Barcelona-Catalunya)
export const SPAIN_MAP: CircuitMapGeometry = {
  circuitId: 'spain',
  name: 'Circuit de Barcelona-Catalunya',
  country: 'Spain',
  flag: '🇪🇸',
  length_km: 4.657,
  turns_count: 14,
  limiting_wheel: 'FL',
  limiting_wheel_name: 'Front-Left (FL)',
  archetype: 'High Lateral Abrasion / Long High-Speed Carousel (Turn 3/9)',
  viewBox: '0 0 1000 600',
  peakScrubLabel: 'Peak FL Scrub (T3 & T9)',
  heavyBrakingLabel: 'Heavy Braking (T1, T4, T10)',
  svgPath:
    "M 700,490 L 800,490 C 850,490 870,470 870,420 L 870,180 C 870,120 840,100 810,120 " +
    "C 780,140 760,170 780,210 C 800,250 870,240 870,300 C 870,350 780,360 680,350 " +
    "L 560,370 C 510,380 490,390 470,360 L 410,310 C 380,280 360,250 350,210 " +
    "L 320,130 C 310,95 270,95 260,140 L 210,260 C 190,310 200,350 220,380 " +
    "L 260,430 C 290,470 330,490 380,490 Z",
  turns: [
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
    { id: 14, name: "Curva Catalunya (T14)",  x: 540, y: 490, type: 'fast_exit',     lateral_g: 3.9, roll_transfer: 84.0, pitch_bias: 36.0, apex_speed_kmh: 238, limiting_tyre: 'FL', heat_flux_kw: 198.0 },
  ],
  sectors: [
    { id: "S1", x: 860, y: 320, label: "SECTOR 1" },
    { id: "S2", x: 345, y: 160, label: "SECTOR 2" },
    { id: "S3", x: 700, y: 490, label: "FINISH / S3" },
  ],
};

// 2. SILVERSTONE (Silverstone Circuit)
export const SILVERSTONE_MAP: CircuitMapGeometry = {
  circuitId: 'silverstone',
  name: 'Silverstone Circuit',
  country: 'Great Britain',
  flag: '🇬🇧',
  length_km: 5.891,
  turns_count: 18,
  limiting_wheel: 'FL',
  limiting_wheel_name: 'Front-Left (FL)',
  archetype: 'Ultra High-Speed Lateral Flow (Maggotts/Becketts/Copse)',
  viewBox: '0 0 1000 600',
  peakScrubLabel: 'Copse / Becketts Peak FL Flow',
  heavyBrakingLabel: 'Heavy Braking (T3 Village, T15 Stowe)',
  svgPath:
    "M 780,260 L 860,250 C 900,245 920,270 910,310 L 880,380 C 860,420 810,430 760,420 " +
    "L 640,400 C 600,390 570,410 550,440 L 520,490 C 490,530 440,530 410,490 " +
    "L 370,430 C 350,400 310,390 270,400 L 160,430 C 120,440 90,410 100,370 " +
    "L 140,240 C 150,200 190,180 230,190 L 370,220 C 420,230 460,200 480,160 " +
    "L 520,90 C 540,50 590,50 620,80 L 710,180 C 740,210 750,260 780,260 Z",
  turns: [
    { id: 1,  name: "Abbey (T1)",              x: 870, y: 250, type: 'peak_scrub',    lateral_g: 4.5, roll_transfer: 85.0, pitch_bias: 40.0, apex_speed_kmh: 275, limiting_tyre: 'FL', heat_flux_kw: 220.0 },
    { id: 2,  name: "Farm (T2)",               x: 910, y: 310, type: 'fast_exit',     lateral_g: 3.2, roll_transfer: 72.0, pitch_bias: 38.0, apex_speed_kmh: 240, limiting_tyre: 'FL', heat_flux_kw: 160.0 },
    { id: 3,  name: "Village (T3)",            x: 880, y: 380, type: 'heavy_braking', lateral_g: 2.1, roll_transfer: 55.0, pitch_bias: 72.0, apex_speed_kmh: 105, limiting_tyre: 'FR', heat_flux_kw: 190.0 },
    { id: 4,  name: "The Loop (T4)",           x: 760, y: 420, type: 'medium',        lateral_g: 2.0, roll_transfer: 52.0, pitch_bias: 50.0, apex_speed_kmh: 88,  limiting_tyre: 'FR', heat_flux_kw: 110.0 },
    { id: 5,  name: "Aintree (T5)",            x: 640, y: 400, type: 'fast_exit',     lateral_g: 2.8, roll_transfer: 65.0, pitch_bias: 38.0, apex_speed_kmh: 190, limiting_tyre: 'FL', heat_flux_kw: 135.0 },
    { id: 6,  name: "Brooklands (T6)",         x: 520, y: 490, type: 'heavy_braking', lateral_g: 3.0, roll_transfer: 70.0, pitch_bias: 68.0, apex_speed_kmh: 145, limiting_tyre: 'FL', heat_flux_kw: 175.0 },
    { id: 7,  name: "Luffield (T7)",           x: 410, y: 490, type: 'medium',        lateral_g: 2.6, roll_transfer: 62.0, pitch_bias: 48.0, apex_speed_kmh: 115, limiting_tyre: 'FL', heat_flux_kw: 130.0 },
    { id: 8,  name: "Woodcote (T8)",           x: 370, y: 430, type: 'fast_exit',     lateral_g: 3.4, roll_transfer: 74.0, pitch_bias: 35.0, apex_speed_kmh: 230, limiting_tyre: 'FL', heat_flux_kw: 180.0 },
    { id: 9,  name: "Copse (T9)",              x: 160, y: 430, type: 'peak_scrub',    lateral_g: 4.8, roll_transfer: 89.0, pitch_bias: 32.0, apex_speed_kmh: 290, limiting_tyre: 'FL', heat_flux_kw: 245.0 },
    { id: 10, name: "Maggotts (T10)",          x: 140, y: 240, type: 'peak_scrub',    lateral_g: 4.9, roll_transfer: 88.0, pitch_bias: 35.0, apex_speed_kmh: 285, limiting_tyre: 'FL', heat_flux_kw: 240.0 },
    { id: 11, name: "Becketts (T11)",          x: 230, y: 190, type: 'peak_scrub',    lateral_g: 4.4, roll_transfer: 86.0, pitch_bias: 42.0, apex_speed_kmh: 245, limiting_tyre: 'FR', heat_flux_kw: 215.0 },
    { id: 12, name: "Chapel (T12)",            x: 370, y: 220, type: 'fast_exit',     lateral_g: 3.9, roll_transfer: 78.0, pitch_bias: 30.0, apex_speed_kmh: 260, limiting_tyre: 'FL', heat_flux_kw: 195.0 },
    { id: 13, name: "Stowe (T15)",             x: 520, y: 90,  type: 'heavy_braking', lateral_g: 3.8, roll_transfer: 79.0, pitch_bias: 66.0, apex_speed_kmh: 185, limiting_tyre: 'FL', heat_flux_kw: 205.0 },
    { id: 14, name: "Vale (T16)",              x: 620, y: 80,  type: 'heavy_braking', lateral_g: 2.2, roll_transfer: 58.0, pitch_bias: 70.0, apex_speed_kmh: 95,  limiting_tyre: 'FR', heat_flux_kw: 160.0 },
    { id: 15, name: "Club (T18)",              x: 710, y: 180, type: 'fast_exit',     lateral_g: 3.5, roll_transfer: 75.0, pitch_bias: 36.0, apex_speed_kmh: 215, limiting_tyre: 'FL', heat_flux_kw: 175.0 },
  ],
  sectors: [
    { id: "S1", x: 760, y: 440, label: "SECTOR 1" },
    { id: "S2", x: 190, y: 160, label: "SECTOR 2" },
    { id: "S3", x: 730, y: 220, label: "FINISH / S3" },
  ],
};

// 3. AUSTRIA (Red Bull Ring - Spielberg)
export const AUSTRIA_MAP: CircuitMapGeometry = {
  circuitId: 'austria',
  name: 'Red Bull Ring (Spielberg)',
  country: 'Austria',
  flag: '🇦🇹',
  length_km: 4.318,
  turns_count: 10,
  limiting_wheel: 'RR',
  limiting_wheel_name: 'Rear-Right (RR)',
  archetype: 'Traction-Dominant / Uphill Braking & Short Chute Power (Turn 1/3)',
  viewBox: '0 0 1000 600',
  peakScrubLabel: 'Uphill Traction Scrub (T1, T3 Exit)',
  heavyBrakingLabel: 'Extreme Braking (T1 Niki Lauda, T3 Remus +65m)',
  svgPath:
    "M 320,480 L 680,480 C 740,480 770,450 750,400 L 690,260 C 670,220 640,210 600,220 " +
    "L 380,280 C 340,290 320,270 340,230 L 460,80 C 490,40 450,20 410,40 " +
    "L 200,160 C 160,180 150,220 180,260 L 250,350 C 270,380 260,420 230,440 " +
    "L 210,460 C 190,480 230,480 320,480 Z",
  turns: [
    { id: 1,  name: "Niki Lauda (T1)",         x: 690, y: 260, type: 'heavy_braking', lateral_g: 3.1, roll_transfer: 70.0, pitch_bias: 74.0, apex_speed_kmh: 140, limiting_tyre: 'RR', heat_flux_kw: 195.0 },
    { id: 2,  name: "Curva (T2)",              x: 500, y: 240, type: 'fast_exit',     lateral_g: 2.2, roll_transfer: 55.0, pitch_bias: 35.0, apex_speed_kmh: 290, limiting_tyre: 'RL', heat_flux_kw: 130.0 },
    { id: 3,  name: "Remus Uphill (T3)",       x: 460, y: 80,  type: 'heavy_braking', lateral_g: 2.4, roll_transfer: 64.0, pitch_bias: 78.0, apex_speed_kmh: 78,  limiting_tyre: 'RR', heat_flux_kw: 235.0 },
    { id: 4,  name: "Schlossgold (T4)",        x: 340, y: 230, type: 'heavy_braking', lateral_g: 3.2, roll_transfer: 72.0, pitch_bias: 71.0, apex_speed_kmh: 125, limiting_tyre: 'FL', heat_flux_kw: 185.0 },
    { id: 5,  name: "Rauch (T5)",              x: 200, y: 160, type: 'medium',        lateral_g: 2.6, roll_transfer: 65.0, pitch_bias: 45.0, apex_speed_kmh: 165, limiting_tyre: 'FR', heat_flux_kw: 140.0 },
    { id: 6,  name: "Gerhard Berger (T6)",     x: 180, y: 260, type: 'medium',        lateral_g: 3.3, roll_transfer: 76.0, pitch_bias: 46.0, apex_speed_kmh: 195, limiting_tyre: 'FR', heat_flux_kw: 165.0 },
    { id: 7,  name: "Wurth (T7)",              x: 250, y: 350, type: 'fast_exit',     lateral_g: 3.5, roll_transfer: 79.0, pitch_bias: 38.0, apex_speed_kmh: 220, limiting_tyre: 'RL', heat_flux_kw: 180.0 },
    { id: 8,  name: "Gösser (T8)",             x: 230, y: 440, type: 'medium',        lateral_g: 3.0, roll_transfer: 68.0, pitch_bias: 48.0, apex_speed_kmh: 185, limiting_tyre: 'RR', heat_flux_kw: 155.0 },
    { id: 9,  name: "Jochen Rindt (T9)",       x: 380, y: 480, type: 'fast_exit',     lateral_g: 3.8, roll_transfer: 82.0, pitch_bias: 35.0, apex_speed_kmh: 240, limiting_tyre: 'RR', heat_flux_kw: 190.0 },
    { id: 10, name: "Amon (T10)",              x: 640, y: 480, type: 'fast_exit',     lateral_g: 3.9, roll_transfer: 84.0, pitch_bias: 34.0, apex_speed_kmh: 255, limiting_tyre: 'RR', heat_flux_kw: 205.0 },
  ],
  sectors: [
    { id: "S1", x: 550, y: 150, label: "SECTOR 1" },
    { id: "S2", x: 190, y: 310, label: "SECTOR 2" },
    { id: "S3", x: 620, y: 495, label: "FINISH / S3" },
  ],
};

// 4. BELGIUM (Circuit de Spa-Francorchamps)
export const BELGIUM_MAP: CircuitMapGeometry = {
  circuitId: 'belgium',
  name: 'Circuit de Spa-Francorchamps',
  country: 'Belgium',
  flag: '🇧🇪',
  length_km: 7.004,
  turns_count: 19,
  limiting_wheel: 'FR',
  limiting_wheel_name: 'Front-Right (FR)',
  archetype: 'High-Speed Elevation & Convective Cooling (Eau Rouge / Pouhon)',
  viewBox: '0 0 1000 600',
  peakScrubLabel: 'Pouhon Peak FR Scrub (T10-T11)',
  heavyBrakingLabel: 'Heavy Braking (T1 La Source, T19 Bus Stop)',
  svgPath:
    "M 740,460 L 820,460 C 860,460 880,430 870,390 L 830,260 C 810,210 780,180 740,190 " +
    "L 610,230 C 560,240 540,210 560,170 L 610,90 C 630,50 590,30 550,50 " +
    "L 380,140 C 330,170 310,210 320,270 L 330,340 C 340,390 310,420 270,410 " +
    "L 170,390 C 130,380 110,410 130,450 L 210,510 C 260,540 330,530 380,490 " +
    "L 520,380 C 560,350 610,360 630,400 L 670,460 Z",
  turns: [
    { id: 1,  name: "La Source (T1)",          x: 850, y: 430, type: 'heavy_braking', lateral_g: 2.1, roll_transfer: 55.0, pitch_bias: 76.0, apex_speed_kmh: 75,  limiting_tyre: 'FR', heat_flux_kw: 185.0 },
    { id: 2,  name: "Eau Rouge (T2)",          x: 770, y: 220, type: 'peak_scrub',    lateral_g: 3.8, roll_transfer: 80.0, pitch_bias: 42.0, apex_speed_kmh: 295, limiting_tyre: 'FR', heat_flux_kw: 215.0 },
    { id: 3,  name: "Raidillon (T4)",          x: 740, y: 190, type: 'peak_scrub',    lateral_g: 4.2, roll_transfer: 84.0, pitch_bias: 38.0, apex_speed_kmh: 305, limiting_tyre: 'FL', heat_flux_kw: 230.0 },
    { id: 5,  name: "Les Combes (T5)",         x: 580, y: 180, type: 'heavy_braking', lateral_g: 3.1, roll_transfer: 71.0, pitch_bias: 69.0, apex_speed_kmh: 140, limiting_tyre: 'FR', heat_flux_kw: 190.0 },
    { id: 7,  name: "Malmedy (T7)",            x: 610, y: 90,  type: 'medium',        lateral_g: 2.7, roll_transfer: 63.0, pitch_bias: 48.0, apex_speed_kmh: 175, limiting_tyre: 'FL', heat_flux_kw: 145.0 },
    { id: 8,  name: "Bruxelles (T8)",          x: 480, y: 110, type: 'medium',        lateral_g: 2.8, roll_transfer: 66.0, pitch_bias: 52.0, apex_speed_kmh: 115, limiting_tyre: 'FR', heat_flux_kw: 155.0 },
    { id: 10, name: "Pouhon (T10-T11)",        x: 320, y: 310, type: 'peak_scrub',    lateral_g: 4.6, roll_transfer: 89.0, pitch_bias: 36.0, apex_speed_kmh: 285, limiting_tyre: 'FR', heat_flux_kw: 260.0 },
    { id: 12, name: "Fagnes (T12)",            x: 230, y: 405, type: 'medium',        lateral_g: 3.2, roll_transfer: 73.0, pitch_bias: 49.0, apex_speed_kmh: 165, limiting_tyre: 'FL', heat_flux_kw: 160.0 },
    { id: 14, name: "Stavelot (T14)",          x: 150, y: 430, type: 'fast_exit',     lateral_g: 3.4, roll_transfer: 75.0, pitch_bias: 38.0, apex_speed_kmh: 215, limiting_tyre: 'FR', heat_flux_kw: 175.0 },
    { id: 17, name: "Blanchimont (T17)",       x: 420, y: 450, type: 'peak_scrub',    lateral_g: 4.3, roll_transfer: 85.0, pitch_bias: 34.0, apex_speed_kmh: 315, limiting_tyre: 'FR', heat_flux_kw: 220.0 },
    { id: 19, name: "Bus Stop Chicane (T19)",  x: 690, y: 440, type: 'heavy_braking', lateral_g: 2.2, roll_transfer: 58.0, pitch_bias: 75.0, apex_speed_kmh: 80,  limiting_tyre: 'FR', heat_flux_kw: 180.0 },
  ],
  sectors: [
    { id: "S1", x: 740, y: 170, label: "SECTOR 1" },
    { id: "S2", x: 280, y: 350, label: "SECTOR 2" },
    { id: "S3", x: 720, y: 460, label: "FINISH / S3" },
  ],
};

export const CIRCUITS_GEOMETRY: Record<'spain' | 'silverstone' | 'austria' | 'belgium', CircuitMapGeometry> = {
  spain: SPAIN_MAP,
  silverstone: SILVERSTONE_MAP,
  austria: AUSTRIA_MAP,
  belgium: BELGIUM_MAP,
};

