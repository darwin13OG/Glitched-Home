import React, { useState } from 'react';
import { Play, Users, Gamepad2, Settings, ArrowLeft, Volume2, Sliders } from 'lucide-react';
import { CHARACTER_SKINS } from '../types/customization';

interface StartMenuProps {
  onStartGame: () => void;
  lookSensitivity: number;
  onSensitivityChange: (val: number) => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  onOpenMultiplayer: () => void;
  selectedSkinId: string;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  onStartGame,
  lookSensitivity,
  onSensitivityChange,
  volume,
  onVolumeChange,
  onOpenMultiplayer,
  selectedSkinId,
}) => {
  const [view, setView] = useState<'main' | 'controls' | 'settings'>('main');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedSkin = CHARACTER_SKINS.find((s) => s.id === selectedSkinId) || CHARACTER_SKINS[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none overflow-hidden font-sans bg-[#050507] animate-in fade-in duration-700">
      {/* CRT VHS SCANLINE OVERLAY */}
      <div 
        className="absolute inset-0 pointer-events-none z-30 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* LEFT SIDEBAR MENU */}
      <div className="relative z-20 w-full md:w-[380px] lg:w-[420px] h-full bg-[#0a0a0d]/95 border-r border-zinc-800/80 backdrop-blur-2xl text-zinc-100 flex flex-col justify-between p-8 md:p-10 shadow-[20px_0_60px_rgba(0,0,0,0.9)]">
        
        {/* SIDEBAR HEADER - CLEAN MINIMALIST HEADER */}
        <div className="pt-2 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
            <span>MENÚ PRINCIPAL</span>
          </div>
        </div>

        {/* MIDDLE CONTENT: STACK OF BUTTONS */}
        <div className="my-auto py-6 space-y-3">
          {view === 'main' && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              {/* 1. NUEVA PARTIDA / JUGAR */}
              <button
                onClick={onStartGame}
                className="w-full py-4 bg-zinc-100 hover:bg-white active:scale-98 text-black font-black text-xs uppercase tracking-[0.22em] rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.35)] transition-all flex items-center justify-between px-6 border border-white group"
              >
                <span className="text-zinc-500 font-mono text-xs opacity-70 group-hover:opacity-100 transition">⟐</span>
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4 fill-black" />
                  NUEVA PARTIDA
                </span>
                <span className="text-zinc-500 font-mono text-xs opacity-70 group-hover:opacity-100 transition">⟐</span>
              </button>

              {/* 2. MULTIJUGADOR */}
              <button
                onClick={onOpenMultiplayer}
                className="w-full py-3.5 bg-zinc-900/90 hover:bg-zinc-800/90 active:scale-98 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-[0.18em] rounded-xl border border-zinc-800 hover:border-amber-500/50 transition-all flex items-center justify-between px-6 group"
              >
                <span className="text-zinc-600 font-mono text-xs group-hover:text-amber-400">⎗</span>
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400 group-hover:text-amber-300" />
                  MULTIJUGADOR
                </span>
                <span className="text-zinc-600 font-mono text-xs group-hover:text-amber-400">⎘</span>
              </button>

              {/* 3. CONTROLES */}
              <button
                onClick={() => setView('controls')}
                className="w-full py-3.5 bg-zinc-900/90 hover:bg-zinc-800/90 active:scale-98 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-[0.18em] rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all flex items-center justify-between px-6 group"
              >
                <span className="text-zinc-600 font-mono text-xs group-hover:text-zinc-300">⟁</span>
                <span className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  CONTROLES
                </span>
                <span className="text-zinc-600 font-mono text-xs group-hover:text-zinc-300">⟁</span>
              </button>

              {/* 4. AJUSTES */}
              <button
                onClick={() => setView('settings')}
                className="w-full py-3.5 bg-zinc-900/90 hover:bg-zinc-800/90 active:scale-98 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-[0.18em] rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all flex items-center justify-between px-6 group"
              >
                <span className="text-zinc-600 font-mono text-xs group-hover:text-zinc-300">⟐</span>
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  AJUSTES
                </span>
                <span className="text-zinc-600 font-mono text-xs group-hover:text-zinc-300">⟐</span>
              </button>
            </div>
          )}

          {/* VIEW 2: CONTROLES */}
          {view === 'controls' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" /> GUÍA DE CONTROLES
                </h2>
              </div>

              <div className="space-y-3 text-xs text-zinc-300 max-h-64 overflow-y-auto pr-1">
                <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider block border-b border-zinc-800 pb-1">
                    Teclado y Ratón (PC)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-zinc-300">
                    <div><strong className="text-white">WASD:</strong> Moverse</div>
                    <div><strong className="text-white">Ratón:</strong> Mirar</div>
                    <div><strong className="text-white">Tecla E:</strong> Interactuar</div>
                    <div><strong className="text-white">Shift:</strong> Correr</div>
                    <div><strong className="text-white">Tecla C:</strong> Agacharse</div>
                    <div><strong className="text-white">Teclas 1-4:</strong> Ítems</div>
                  </div>
                </div>

                <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider block border-b border-zinc-800 pb-1">
                    Táctil (Móvil)
                  </span>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Joystick a la izquierda para caminar, desliza a la derecha para girar la vista y pulsa botones para interactuar.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setView('main')}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 border border-zinc-700/50"
              >
                <ArrowLeft className="w-4 h-4" /> VOLVER
              </button>
            </div>
          )}

          {/* VIEW 3: AJUSTES */}
          {view === 'settings' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> CONFIGURACIÓN
                </h2>
              </div>

              <div className="space-y-3">
                {/* Volume Slider */}
                <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                  <label className="text-xs font-medium text-zinc-200 flex justify-between">
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-zinc-400" /> Volumen General
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
                    className="w-full accent-zinc-300 bg-zinc-800 rounded-lg cursor-pointer h-2"
                  />
                </div>

                {/* Mouse Sensitivity Slider */}
                <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                  <label className="text-xs font-medium text-zinc-200 flex justify-between">
                    <span className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-zinc-400" /> Sensibilidad Cámara
                    </span>
                    <span className="font-mono text-white font-bold">
                      {(lookSensitivity * 1000).toFixed(1)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.008"
                    step="0.0005"
                    value={lookSensitivity}
                    onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
                    className="w-full accent-zinc-300 bg-zinc-800 rounded-lg cursor-pointer h-2"
                  />
                </div>
              </div>

              <button
                onClick={() => setView('main')}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 border border-zinc-700/50"
              >
                <ArrowLeft className="w-4 h-4" /> VOLVER
              </button>
            </div>
          )}
        </div>

        {/* TOAST NOTIFICATION BADGE */}
        {toastMessage && (
          <div className="bg-zinc-900 text-zinc-200 border border-zinc-700/80 px-4 py-2.5 rounded-xl text-xs font-mono text-center shadow-lg animate-in fade-in duration-200 mb-2">
            {toastMessage}
          </div>
        )}

        {/* BOTTOM SPACER / CLEAN FOOTER */}
        <div className="pt-2 text-center text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
          <span>v1.0</span>
        </div>
      </div>

      {/* RIGHT SIDE VIEWPORT AREA: 3D SCENE BACKDROP WITH THE SINGLE MAIN GLITCHED LOGO */}
      <div className="flex-1 hidden md:flex relative pointer-events-none items-center justify-center overflow-hidden">
        {/* Dark Vignette Overlay from Left to Right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0d] via-black/40 to-black/80" />

        {/* MAIN MODERN GLITCHED TITLE LOGO OVER THE 3D SCENE */}
        <div className="relative z-10 text-center select-none transform p-8">
          <div className="relative inline-block font-sans">
            {/* Main Base Text */}
            <h1 className="text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter text-zinc-100 font-sans leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.25)] opacity-90">
              GLITCHED<br />HOME
            </h1>

            {/* VHS Slice Layer 1 (Red Glitch Shift) */}
            <h1 className="text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter text-red-500/70 font-sans leading-tight absolute top-0 left-0 pointer-events-none mix-blend-screen animate-vhs-slice-1">
              GLITCHED<br />HOME
            </h1>

            {/* VHS Slice Layer 2 (Cyan Glitch Shift) */}
            <h1 className="text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter text-cyan-400/70 font-sans leading-tight absolute top-0 left-0 pointer-events-none mix-blend-screen animate-vhs-slice-2">
              GLITCHED<br />HOME
            </h1>
          </div>
        </div>
      </div>

    </div>
  );
};
