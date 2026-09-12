import React from 'react';
import type { AblationConfig } from '../types/telemetry';
import { X, Sliders, RotateCcw, Wind, Weight, Gauge, Info } from 'lucide-react';

interface AblationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AblationConfig;
  onChange: (newConfig: AblationConfig) => void;
}

export const AblationDrawer: React.FC<AblationDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onChange({
      aeroDeficit: 0.88,
      massSquaredScaling: true,
      paceManagementPush: 0.94,
    });
  };

  const extraHeat = ((1.0 - config.aeroDeficit) * 40.0).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-[#101018] border-l border-haas-border h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-haas-border pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-haas-red" />
              <div>
                <h3 className="text-base font-extrabold text-haas-white font-mono uppercase tracking-tight">
                  Panel 5: Vehicle Physics Parameter Controls
                </h3>
                <p className="text-xs text-haas-gray font-mono">
                  TrackShift Engineering Ablation Console
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-haas-gray hover:text-white rounded-lg hover:bg-[#1c1c28] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls List */}
          <div className="space-y-6">

            {/* Control 1: Haas Aero Deficit Factor (0.80 to 1.00) */}
            <div className="bg-[#15151E] p-4 rounded-xl border border-haas-border/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-haas-white font-mono flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-haas-red" />
                  Haas Aero Deficit Factor
                </label>
                <span className="text-xs font-mono font-black text-haas-red bg-haas-red/10 px-2.5 py-0.5 rounded border border-haas-red/40">
                  {config.aeroDeficit.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-haas-gray mb-3 leading-relaxed">
                Models aerodynamic downforce deficit relative to frontrunners. Induces higher contact patch micro-sliding and elevates thermodynamic heating.
              </p>
              <input
                type="range"
                min="0.80"
                max="1.00"
                step="0.01"
                value={config.aeroDeficit}
                onChange={(e) => onChange({ ...config, aeroDeficit: parseFloat(e.target.value) })}
                className="w-full accent-haas-red cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-haas-gray mt-1.5">
                <span>0.80 (Heavy Slide)</span>
                <span className="text-haas-white font-bold">Default: 0.88</span>
                <span>1.00 (Zero Deficit)</span>
              </div>
              <div className="mt-3 p-2 rounded-lg bg-[#0B0B0E] border border-haas-border/70 text-[11px] font-mono text-haas-amber flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Induces <strong>+{extraHeat}°C</strong> tyre surface heating via elevated slip angle.</span>
              </div>
            </div>

            {/* Control 2: Mass-Squared Energy Scaling (M_race / M_FP)^2 */}
            <div className="bg-[#15151E] p-4 rounded-xl border border-haas-border/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-haas-white font-mono flex items-center gap-1.5">
                  <Weight className="w-4 h-4 text-haas-cyan" />
                  Mass-Squared Energy Scaling
                </label>
                <button
                  onClick={() => onChange({ ...config, massSquaredScaling: !config.massSquaredScaling })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    config.massSquaredScaling ? 'bg-haas-red shadow-sm shadow-haas-red/50' : 'bg-[#242432]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      config.massSquaredScaling ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-haas-gray mb-2 leading-relaxed">
                Toggle button applying the <code>(M_race / M_FP)²</code> fuel workload multiplier to frictional shear power during high-fuel race starts.
              </p>
              <div className="text-[10px] font-mono text-slate-400 bg-[#0B0B0E] p-2 rounded-lg border border-haas-border/70">
                Scaling Status: <span className="text-haas-cyan font-bold">{config.massSquaredScaling ? 'Enabled (Quadratic Inertia)' : 'Disabled (Linear 1.0x)'}</span>
              </div>
            </div>

            {/* Control 3: Pace Management Factor (Lift-and-Coast, 0.90 to 1.00) */}
            <div className="bg-[#15151E] p-4 rounded-xl border border-haas-border/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-haas-white font-mono flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Pace Management (Lift-and-Coast)
                </label>
                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded border border-emerald-500/40">
                  {config.paceManagementPush.toFixed(2)} ({(config.paceManagementPush * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-[11px] text-haas-gray mb-3 leading-relaxed">
                Calibrates driver lift-and-coast and tyre conservation management during mid-stint race pacing.
              </p>
              <input
                type="range"
                min="0.90"
                max="1.00"
                step="0.01"
                value={config.paceManagementPush}
                onChange={(e) => onChange({ ...config, paceManagementPush: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-haas-gray mt-1.5">
                <span>0.90 (Conservation)</span>
                <span className="text-haas-white font-bold">Default: 0.94</span>
                <span>1.00 (Flat-Out Push)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-haas-border flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-mono text-haas-gray hover:text-white px-3 py-2 rounded-lg border border-haas-border hover:bg-[#181824] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-haas-red hover:bg-red-700 text-white font-mono text-xs font-bold py-2.5 rounded-lg shadow-haas-red transition-all"
          >
            Apply to Physics Engine
          </button>
        </div>

      </div>
    </div>
  );
};
