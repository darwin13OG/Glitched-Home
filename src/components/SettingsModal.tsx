import React from 'react';
import { X, Volume2, Sun, MousePointer, Smartphone, RefreshCw, Home } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetGame: () => void;
  onGoMainMenu?: () => void;
  lookSensitivity: number;
  onSensitivityChange: (val: number) => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  brightness: number;
  onBrightnessChange: (val: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetGame,
  onGoMainMenu,
  lookSensitivity,
  onSensitivityChange,
  volume,
  onVolumeChange,
  brightness,
  onBrightnessChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-md w-full p-6 text-zinc-100 shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Casa Misteriosa</span>
            <h2 className="text-base font-light uppercase tracking-tight text-white">
              Configuración
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Sliders */}
        <div className="space-y-4">
          {/* Volume Control */}
          <div>
            <label className="text-xs font-medium text-zinc-300 flex justify-between mb-2">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-white" /> Volumen General
              </span>
              <span className="font-mono text-white font-bold">{Math.round(volume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-white bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Brightness Control */}
          <div>
            <label className="text-xs font-medium text-zinc-300 flex justify-between mb-2">
              <span className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-white" /> Brillo / Exposición
              </span>
              <span className="font-mono text-white font-bold">{Math.round(brightness * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.1"
              value={brightness}
              onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
              className="w-full accent-white bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sensitivity Control */}
          <div>
            <label className="text-xs font-medium text-zinc-300 flex justify-between mb-2">
              <span className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-white" /> Sensibilidad de Cámara / Ratón
              </span>
              <span className="font-mono text-white font-bold">{(lookSensitivity * 1000).toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.0005"
              max="0.008"
              step="0.0005"
              value={lookSensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full accent-white bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Controls Guide */}
          <div className="bg-black/60 rounded-xl p-4 border border-white/10 space-y-2 text-xs">
            <h3 className="font-bold text-zinc-200 uppercase text-[10px] tracking-widest border-b border-white/10 pb-1.5 mb-2">
              Controles del Jugador
            </h3>

            <div className="grid grid-cols-2 gap-2 text-zinc-400">
              <div>
                <span className="text-white font-medium">PC:</span> WASD / Flechas
              </div>
              <div>
                <span className="text-white font-medium">Mirar:</span> Ratón (Clic)
              </div>
              <div>
                <span className="text-white font-medium">Correr:</span> Shift
              </div>
              <div>
                <span className="text-white font-medium">Saltar:</span> Espacio
              </div>
              <div>
                <span className="text-white font-medium">Agacharse:</span> C / Ctrl
              </div>
              <div>
                <span className="text-white font-medium">Interactuar:</span> E
              </div>
              <div>
                <span className="text-white font-medium">Linterna:</span> F
              </div>
              <div>
                <span className="text-white font-medium">Inventario:</span> Teclas 1 - 4
              </div>
            </div>

            <div className="pt-2 text-zinc-400 flex items-center gap-2 border-t border-white/5 mt-2">
              <Smartphone className="w-4 h-4 text-zinc-300 shrink-0" />
              <span>Soporte táctil activo en teléfonos y tablets.</span>
            </div>
          </div>

          {/* Action Buttons: Reset & Main Menu */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                onResetGame();
                onClose();
              }}
              className="py-3 bg-white/10 hover:bg-zinc-800 border border-white/10 text-white text-xs uppercase tracking-wider font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Reiniciar
            </button>
            <button
              onClick={() => {
                if (onGoMainMenu) onGoMainMenu();
                onClose();
              }}
              className="py-3 bg-red-900/60 hover:bg-red-800 border border-red-500/50 text-white text-xs uppercase tracking-wider font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4 text-red-300" />
              Menú Principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
