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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-[#101018] border-l border-haas-border h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-haas-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-haas-red" />
              <div>
                <h3 className="text-base font-bold text-haas-white font-mono uppercase">
                  Engineering Ablation Controls
                </h3>
                <p className="text-xs text-haas-gray">
                  Calibrate Physical Assumptions & Scaling Factors
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-haas-gray hover:text-white rounded-md hover:bg-[#1c1c28]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls List */}
          <div className="space-y-6">

            {/* Control 1: Aero Deficit */}
            <div className="bg-[#15151E] p-4 rounded-lg border border-haas-border/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-haas-white font-mono flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-haas-red" />
                  Haas Aerodynamic Deficit Factor
                </label>
                <span className="text-xs font-mono font-bold text-haas-red bg-haas-red/10 px-2 py-0.5 rounded border border-haas-red/30">
                  {config.aeroDeficit.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-haas-gray mb-3">
                Models downforce loss relative to top constructors. Induces extra micro-sliding and elevates tread temperature.
              </p>
              <input
                type="range"
                min="0.75"
                max="1.00"
                step="0.01"
                value={config.aeroDeficit}
                onChange={(e) => onChange({ ...config, aeroDeficit: parseFloat(e.target.value) })}
                className="w-full accent-haas-red cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-haas-gray mt-1">
                <span>0.75 (Heavy Wake)</span>
                <span className="text-haas-white font-bold">Default: 0.88</span>
                <span>1.00 (Zero Deficit)</span>
              </div>
              <div className="mt-2.5 p-2 rounded bg-[#0B0B0E] border border-haas-border/60 text-[11px] font-mono text-haas-amber flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Generates <strong>+{extraHeat}°C</strong> contact patch thermal rise.</span>
              </div>
            </div>

            {/* Control 2: Mass Squared Scaling */}
            <div className="bg-[#15151E] p-4 rounded-lg border border-haas-border/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-haas-white font-mono flex items-center gap-1.5">
                  <Weight className="w-4 h-4 text-haas-cyan" />
                  Mass-Squared Fuel Work Scaling
                </label>
                <button
                  onClick={() => onChange({ ...config, massSquaredScaling: !config.massSquaredScaling })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    config.massSquaredScaling ? 'bg-haas-red' : 'bg-[#242432]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      config.massSquaredScaling ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-haas-gray mb-2">
                Scales frictional power by <code>(Mass_Race / Mass_FP)²</code> to account for inertial momentum during high-fuel race starts.
              </p>
              <div className="text-[10px] font-mono text-slate-400 bg-[#0B0B0E] p-2 rounded border border-haas-border/60">
                Active Factor: <span className="text-haas-cyan font-bold">{config.massSquaredScaling ? 'Enabled (Quadratic Inertia)' : 'Disabled (Linear)'}</span>
              </div>
            </div>

            {/* Control 3: Pace Management Push Level */}
            <div className="bg-[#15151E] p-4 rounded-lg border border-haas-border/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-haas-white font-mono flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Pace Management / Push Level
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  {(config.paceManagementPush * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-haas-gray mb-3">
                Calibrates driver lift-and-coast and tyre preservation tactics during long race stints.
              </p>
              <input
                type="range"
                min="0.85"
                max="1.00"
                step="0.01"
                value={config.paceManagementPush}
                onChange={(e) => onChange({ ...config, paceManagementPush: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-haas-gray mt-1">
                <span>85% (Heavy Saving)</span>
                <span className="text-haas-white font-bold">94% (Target)</span>
                <span>100% (Flat-Out)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-haas-border flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-mono text-haas-gray hover:text-white px-3 py-2 rounded border border-haas-border hover:bg-[#181824] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-haas-red hover:bg-red-700 text-white font-mono text-xs font-bold py-2 rounded shadow-haas-red transition-all"
          >
            Apply to Engine
          </button>
        </div>

      </div>
    </div>
  );
};
