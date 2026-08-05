import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, Item, PlayerState, Task } from '../types/game';
import { Settings, Shield, Zap, Heart, Volume2, Hand, Footprints, Eye, Radio, Sparkles, HelpCircle, Crosshair, Flashlight, PlusSquare } from 'lucide-react';

interface HUDProps {
  playerState: PlayerState;
  currentTask?: Task;
  phase: GamePhase;
  currentDay?: number;
  interactionPrompt: string | null;
  backroomsTimer?: number | null;
  prepTimer?: number | null;
  multiplayerPlayers?: { id: string; name: string; health: number }[];
  onInteract: () => void;
  onSelectSlot: (index: number) => void;
  onToggleFlashlight: () => void;
  onToggleSettings: () => void;
  onVirtualJoystickMove: (x: number, y: number) => void;
  onVirtualLookMove: (deltaX: number, deltaY: number) => void;
  onVirtualJump: () => void;
  onVirtualSprint: (sprinting: boolean) => void;
  onVirtualCrouch: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerState,
  currentTask,
  phase,
  currentDay = 1,
  interactionPrompt,
  backroomsTimer,
  prepTimer,
  multiplayerPlayers,
  onInteract,
  onSelectSlot,
  onToggleFlashlight,
  onToggleSettings,
  onVirtualJoystickMove,
  onVirtualLookMove,
  onVirtualJump,
  onVirtualSprint,
  onVirtualCrouch,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Virtual Joystick Handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setJoystickPos({ x: 0, y: 0 });
        onVirtualJoystickMove(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const maxRadius = rect.width / 2;

    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setJoystickPos({ x: dx, y: dy });
    // Normalize to -1 to 1 (Forward is -y in screen space, +1 in game movement)
    onVirtualJoystickMove(dx / maxRadius, -dy / maxRadius);
  };

  // Virtual Touch Look Handler
  const handleLookTouchStart = (e: React.TouchEvent) => {
    if (lookTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        onVirtualLookMove(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  // Body status color based on health
  const bodyColor =
    playerState.health > 70 ? '#22c55e' : playerState.health > 35 ? '#eab308' : '#ef4444';

  const selectedItem = playerState.inventory[playerState.selectedSlot];

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 overflow-hidden z-20">
      {/* LOW HEALTH SCREEN DISTORTION & VIGNETTE EFFECT (<40 HP) */}
      {playerState.health < 40 && (
        <div
          className={`fixed inset-0 pointer-events-none z-30 transition-all duration-300 ${
            playerState.health < 20 ? 'animate-pulse' : ''
          }`}
          style={{
            boxShadow: `inset 0 0 ${Math.max(60, (40 - playerState.health) * 3.5)}px rgba(220, 38, 38, ${
              0.4 + (40 - playerState.health) * 0.012
            }), inset 0 0 40px rgba(0, 0, 0, 0.8)`,
            backdropFilter: playerState.health < 25 ? 'blur(0.8px) contrast(1.2) saturate(1.3)' : 'none',
          }}
        >
          {/* Blood splatters & critical warning text */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="text-red-500/80 font-black font-mono text-xs uppercase tracking-widest bg-black/80 px-3 py-1 rounded-full border border-red-500/40 shadow-lg">
              ⚠️ SALUD CRÍTICA ({Math.round(playerState.health)}%)
            </span>
          </div>
        </div>
      )}
      {/* Touch Look Area (Only active on Touch Devices for dragging look camera) */}
      {isTouchDevice && (
        <div
          className="absolute inset-0 pointer-events-auto z-0"
          onTouchStart={handleLookTouchStart}
          onTouchMove={handleLookTouchMove}
          onTouchEnd={handleLookTouchEnd}
        />
      )}

      {/* TOP HUD BAR */}
      <div className="relative z-10 flex items-start justify-between w-full gap-2">
        {/* LEFT SIDE: Player Health, Stamina & Co-Op Team Status */}
        <div className="flex flex-col gap-1.5 bg-[#0a0a0a]/90 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-white/10 shadow-2xl shrink-0 max-w-[170px] sm:max-w-[220px]">
          {/* Health circular emblem & bar */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-red-500/80 flex items-center justify-center bg-red-950/80 shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              <span className="text-red-400 font-extrabold text-[9px] sm:text-[10px] tracking-tight">HP</span>
            </div>
            
            <div className="flex flex-col gap-0.5 w-full">
              {/* Health Bar */}
              <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-zinc-300 font-bold tracking-wider uppercase">
                <span className="text-red-400">Salud</span>
                <span className="text-white font-mono">{Math.round(playerState.health)}%</span>
              </div>
              <div className="h-2 sm:h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-red-700 via-red-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${playerState.health}%` }}
                />
              </div>

              {/* Stamina Gauge */}
              <div className="flex justify-between items-center text-[8px] sm:text-[9px] text-zinc-400 font-bold tracking-wider uppercase mt-0.5">
                <span>Estamina</span>
                <span className="text-zinc-200 font-mono">{Math.round(playerState.stamina)}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-150"
                  style={{ width: `${playerState.stamina}%` }}
                />
              </div>
            </div>
          </div>

          {/* Co-Op Teammates Health (Stacked on Left) */}
          {multiplayerPlayers && multiplayerPlayers.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-white/10 pt-1.5 mt-0.5">
              <div className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center justify-between">
                <span>EQUIPO ({multiplayerPlayers.length})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                {multiplayerPlayers.map((mate) => (
                  <div key={mate.id} className="flex items-center justify-between text-[9px] text-zinc-300 gap-1.5">
                    <span className="truncate max-w-[70px] sm:max-w-[100px] font-medium">{mate.name}</span>
                    <div className="w-10 sm:w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${mate.health}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TOP-CENTER: Current Objective & Timers */}
        <div className="flex flex-col items-center max-w-[220px] sm:max-w-md text-center gap-1.5 mx-auto">
          {/* Day Cycle Badge */}
          <div className="inline-flex items-center gap-2 bg-zinc-900/90 border border-amber-500/40 text-amber-400 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase shadow-lg">
            <span>☀️ DÍA {currentDay}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-zinc-400">{phase === 'CALM' ? 'PREPARACIÓN' : phase === 'GLITCH' ? 'ANOMALÍA' : 'DEFENSA'}</span>
          </div>

          {currentTask && (
            <div className="bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-left shadow-lg w-full break-words text-balance">
              <div className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                Objetivo Actual
              </div>
              <div className="text-xs text-white font-bold tracking-tight mt-0.5 leading-snug">{currentTask.title}</div>
              <div className="text-[10px] text-zinc-300 leading-snug">{currentTask.description}</div>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Timers & Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Backrooms Exploration Timer */}
          {backroomsTimer !== null && backroomsTimer !== undefined && (
            <div className="bg-amber-950/90 border border-amber-500/60 text-amber-200 px-3 py-1 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2 font-mono">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">⏱️ Backrooms</span>
              <span className="text-sm font-black text-white bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500/40">{backroomsTimer}s</span>
            </div>
          )}

          {/* Defense Preparation Timer */}
          {prepTimer !== null && prepTimer !== undefined && (
            <div className="bg-red-950/90 border border-red-500/60 text-red-200 px-3 py-1 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center gap-2 font-mono animate-pulse">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">⚠️ Invasión</span>
              <span className="text-sm font-black text-white bg-red-900/80 px-2 py-0.5 rounded border border-red-500/40">{prepTimer}s</span>
            </div>
          )}

          <button
            onClick={onToggleSettings}
            className="pointer-events-auto p-2 sm:p-3 bg-[#0a0a0a]/80 hover:bg-zinc-900 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white transition shadow-xl active:scale-95"
            title="Configuración"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* CENTER: Dot Crosshair & Context Interaction Prompt */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        {/* Clean Dot Crosshair - FIXED SIZE */}
        <div className="w-2 h-2 bg-white/90 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.9)] border border-black/50 pointer-events-none" />

        {/* Context interaction prompt - FIXED STATIC BUTTON */}
        {interactionPrompt && (
          <button
            onClick={onInteract}
            className="pointer-events-auto mt-4 px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-2xl flex items-center gap-2 border border-white/40 backdrop-blur-md transition transform active:scale-95 select-none"
          >
            <Hand className="w-4 h-4" />
            <span>{interactionPrompt}</span>
          </button>
        )}
      </div>

      {/* BOTTOM SECTION: Inventory Hotbar & Touch Controls */}
      <div className="relative z-10 flex flex-col items-center gap-2 w-full">
        {/* Selected Item Information Card */}
        {selectedItem && (
          <div className="bg-black/85 border border-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-center shadow-2xl max-w-sm flex flex-col items-center gap-0.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <span className="text-lg">{selectedItem.icon}</span>
              <span>{selectedItem.name}</span>
              {selectedItem.type === 'weapon' && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/40">
                  {playerState.ammo > 0 ? `${playerState.ammo} Balas` : 'Sin Munición'}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-300 font-medium leading-tight">
              {selectedItem.description ||
                (selectedItem.type === 'weapon'
                  ? 'Haz Clic Izquierdo para disparar a los monstruos.'
                  : selectedItem.type === 'flashlight'
                  ? 'Presiona F o Clic para alternar la luz.'
                  : 'Presiona E o selecciona para usar.')}
            </div>
          </div>
        )}

        {/* Inventory Hotbar (Clean 4 Slots with ammo/heal badges) */}
        <div className="flex items-center justify-center gap-2 bg-black/60 backdrop-blur-md p-2 border border-white/10 rounded-xl shadow-2xl">
          {playerState.inventory.map((item, idx) => {
            const isSelected = playerState.selectedSlot === idx;
            return (
              <button
                key={idx}
                onClick={() => onSelectSlot(idx)}
                title={item ? `${item.name}: ${item.description}` : 'Slot Vacío'}
                className={`pointer-events-auto relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105'
                    : 'border-white/15 bg-zinc-900/80 hover:bg-zinc-800 hover:border-white/30'
                }`}
              >
                {item ? (
                  item.type === 'weapon' ? (
                    <div className="flex flex-col items-center">
                      <Crosshair className="w-6 h-6 text-red-400 mb-0.5" />
                      <span className="text-[9px] font-bold text-red-300 font-mono leading-tight">
                        Pistola
                      </span>
                      <span className="absolute bottom-1 right-1 bg-red-950/90 text-red-300 border border-red-500/50 px-1 py-0.2 rounded text-[8px] font-mono font-black">
                        {playerState.ammo} bala{playerState.ammo !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : item.type === 'flashlight' ? (
                    <div className="flex flex-col items-center">
                      <Zap className="w-6 h-6 text-yellow-300 mb-0.5" />
                      <span className="text-[9px] font-bold text-yellow-200 font-mono leading-tight">
                        Linterna
                      </span>
                    </div>
                  ) : item.type === 'medkit' ? (
                    <div className="flex flex-col items-center">
                      <PlusSquare className="w-6 h-6 text-emerald-400 mb-0.5" />
                      <span className="text-[9px] font-bold text-emerald-300 font-mono leading-tight">
                        Botiquín
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl">{item.icon}</span>
                  )
                ) : (
                  <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">
                    Vacío
                  </span>
                )}
                <span className="absolute top-1 left-1.5 text-[10px] font-mono text-zinc-400 font-extrabold">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>

        {/* MOBILE TOUCH CONTROLS OVERLAY (Only rendered on mobile touch devices) */}
        {isTouchDevice && (
          <div className="flex justify-between items-end w-full px-1 sm:px-2 pt-1 pb-1">
            {/* Virtual Joystick (Bottom-Left) */}
            <div
              ref={joystickRef}
              onTouchStart={handleJoystickTouchStart}
              onTouchMove={handleJoystickTouchMove}
              onTouchEnd={handleJoystickTouchEnd}
              className="pointer-events-auto relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center touch-none shadow-2xl shrink-0"
            >
              {/* Inner Joystick Thumb Knob */}
              <div
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-amber-400/30 border border-amber-400 shadow-xl transition-transform duration-75 cursor-move"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                }}
              />
            </div>

            {/* Action Buttons Cluster (Bottom-Right) */}
            <div className="flex flex-col gap-2 pointer-events-auto items-end shrink-0">
              <div className="flex gap-2">
                {/* Interact Button */}
                <button
                  onClick={onInteract}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-amber-500/30 border border-amber-400/80 backdrop-blur-md flex flex-col items-center justify-center text-amber-200 active:scale-95 shadow-lg"
                  title="Interactuar"
                >
                  <Hand className="w-4 h-4 text-amber-300" />
                  <span className="text-[8px] font-bold">E</span>
                </button>

                {/* Flashlight Button */}
                <button
                  onClick={onToggleFlashlight}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-yellow-500/30 border border-yellow-400/80 backdrop-blur-md flex flex-col items-center justify-center text-yellow-200 active:scale-95 shadow-lg"
                  title="Linterna"
                >
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-[8px] font-bold">F</span>
                </button>
              </div>

              <div className="flex gap-2">
                {/* Crouch Button */}
                <button
                  onClick={onVirtualCrouch}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex flex-col items-center justify-center text-white active:scale-95 shadow-lg"
                  title="Agacharse"
                >
                  <Footprints className="w-4 h-4 text-zinc-300" />
                  <span className="text-[8px] font-bold">C</span>
                </button>

                {/* Jump Button */}
                <button
                  onClick={onVirtualJump}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex flex-col items-center justify-center text-white active:scale-95 shadow-lg"
                  title="Saltar"
                >
                  <span className="text-xs font-black">⬆</span>
                  <span className="text-[8px] font-bold">SALTAR</span>
                </button>

                {/* Sprint Button */}
                <button
                  onTouchStart={() => onVirtualSprint(true)}
                  onTouchEnd={() => onVirtualSprint(false)}
                  onMouseDown={() => onVirtualSprint(true)}
                  onMouseUp={() => onVirtualSprint(false)}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex flex-col items-center justify-center text-white active:scale-95 shadow-lg"
                  title="Correr"
                >
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-[8px] font-bold">CORRER</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
