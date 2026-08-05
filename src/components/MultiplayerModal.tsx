import React, { useState } from 'react';
import { Users, Shield, Radio, CheckCircle, Copy, ArrowLeft, Play, Sparkles } from 'lucide-react';
import { CHARACTER_SKINS, MultiplayerPlayer } from '../types/customization';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onStartMultiplayerGame: (roomCode: string, players: MultiplayerPlayer[]) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  selectedSkinId,
  onSelectSkin,
  onStartMultiplayerGame,
}) => {
  const [activeTab, setActiveTab] = useState<'lobby' | 'skins'>('lobby');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Connected players in room (starts with only the local host)
  const [players, setPlayers] = useState<MultiplayerPlayer[]>([
    {
      id: 'p1',
      name: 'Tú (Anfitrión)',
      skinId: selectedSkinId,
      isHost: true,
      isReady: true,
      health: 100,
      ping: 18,
    },
  ]);

  const handleAddSimulatedPlayer = () => {
    if (players.length >= 4) return;
    const names = ['Sobreviviente_Alex', 'Elena_Coop', 'Guardia_Carlos', 'Agente_Maria'];
    const unusedName = names.find((n) => !players.some((p) => p.name === n)) || `Jugador_${players.length + 1}`;
    const otherSkin = selectedSkinId === 'female_survivor' ? 'male_survivor' : 'female_survivor';

    setPlayers((prev) => [
      ...prev,
      {
        id: `p_${Date.now()}`,
        name: unusedName,
        skinId: otherSkin,
        isHost: false,
        isReady: true,
        health: 100,
        ping: Math.floor(20 + Math.random() * 30),
      },
    ]);
  };

  if (!isOpen) return null;

  const handleCreateRoom = () => {
    const newCode = `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomCode(newCode);
  };

  const handleJoinRoom = () => {
    const raw = joinCodeInput.trim().toUpperCase();
    if (raw) {
      const formatted = raw.startsWith('ROOM-') ? raw : `ROOM-${raw}`;
      setRoomCode(formatted);
    }
  };

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard?.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedSkin = CHARACTER_SKINS.find((s) => s.id === selectedSkinId) || CHARACTER_SKINS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-[#0d0d12] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[90vh]">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">SALA MULTIJUGADOR CO-OP</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {roomCode ? `SALA ACTIVA: ${roomCode}` : 'Sobrevivan juntos a las anomalias'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex border-b border-zinc-800/80 bg-black/40">
          <button
            onClick={() => setActiveTab('lobby')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'lobby'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-4 h-4" /> LOBBY Y SALA ({players.length}/4)
          </button>
          <button
            onClick={() => setActiveTab('skins')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'skins'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> PERSONAJE ({selectedSkin.icon})
          </button>
        </div>

        {/* TAB 1: LOBBY & ROOM CREATION */}
        {activeTab === 'lobby' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            {!roomCode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CREATE ROOM CARD */}
                <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-zinc-700 transition">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Radio className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crear Nueva Sala</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Genera un código único para invitar a tus amigos a tu sesión cooperativa.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-amber-500/20"
                  >
                    CREAR CÓDIGO DE SALA
                  </button>
                </div>

                {/* JOIN ROOM CARD */}
                <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-zinc-700 transition">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Unirse con Código</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Ingresa el código numérico de la sala del anfitrión.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center bg-black/60 border border-zinc-700 rounded-xl overflow-hidden focus-within:border-amber-500 transition">
                      <span className="bg-zinc-800 text-amber-400 font-mono text-xs font-bold px-3 py-2 border-r border-zinc-700 select-none">
                        ROOM-
                      </span>
                      <input
                        type="text"
                        placeholder="8492"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        className="w-full bg-transparent px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleJoinRoom}
                      disabled={!joinCodeInput.trim()}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition"
                    >
                      UNIRSE A SALA
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ACTIVE ROOM LOBBY DETAILS */
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* ROOM CODE BAR */}
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-widest block">
                      CÓDIGO DE ACCESO CO-OP
                    </span>
                    <span className="text-2xl font-black font-mono text-white tracking-widest">
                      {roomCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? '¡COPIADO!' : 'COPIAR'}
                  </button>
                </div>

                {/* CONNECTED PLAYERS LIST */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                    <span>JUGADORES EN SALA ({players.length}/4)</span>
                    <span className="text-emerald-400 text-[10px] font-mono">CONEXIÓN P2P EN LÍNEA</span>
                  </h4>

                  <div className="space-y-2">
                    {players.map((p) => {
                      const skin = CHARACTER_SKINS.find((s) => s.id === p.skinId) || CHARACTER_SKINS[0];
                      return (
                        <div
                          key={p.id}
                          className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{skin.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{p.name}</span>
                                {p.isHost && (
                                  <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-full font-mono font-bold">
                                    ANFITRIÓN
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                Personaje: {skin.name} • Ping: {p.ping}ms
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-mono font-bold text-emerald-400">LISTO</span>
                          </div>
                        </div>
                      );
                    })}

                    {players.length < 4 && (
                      <button
                        onClick={handleAddSimulatedPlayer}
                        className="w-full py-2.5 border border-dashed border-zinc-700 hover:border-amber-500/60 bg-zinc-900/40 hover:bg-zinc-800/60 rounded-xl text-zinc-400 hover:text-amber-400 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
                      >
                        <span>+ Simular Entrada de Compañero Co-Op</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* START GAME BUTTON */}
                <button
                  onClick={() => onStartMultiplayerGame(roomCode, players)}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-black" />
                  INICIAR PARTIDA EN GRUPO ({players.length} JUGADORES)
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHARACTER SKINS SELECTOR */}
        {activeTab === 'skins' && (
          <div className="p-6 space-y-4 overflow-y-auto">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              SELECCIONA TU PERSONAJE
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHARACTER_SKINS.map((skin) => {
                const isSelected = selectedSkinId === skin.id;
                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      onSelectSkin(skin.id);
                      setPlayers((prev) =>
                        prev.map((p) => (p.isHost ? { ...p, skinId: skin.id } : p))
                      );
                    }}
                    className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-3xl p-2 bg-black/40 rounded-xl border border-white/10">
                      {skin.icon}
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {skin.name}
                        </span>
                        <span
                          className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase"
                          style={{
                            backgroundColor: `${skin.colorHex}22`,
                            color: skin.colorHex,
                            borderColor: `${skin.colorHex}44`,
                            borderWidth: '1px',
                          }}
                        >
                          {skin.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{skin.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
