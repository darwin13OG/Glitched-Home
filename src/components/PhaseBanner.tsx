import React, { useEffect, useState } from 'react';
import { GamePhase } from '../types/game';

interface PhaseBannerProps {
  phase: GamePhase;
}

export const PhaseBanner: React.FC<PhaseBannerProps> = ({ phase }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [phase]);

  if (!visible) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 pointer-events-none z-40 flex items-center justify-center p-4">
      <div className="max-w-md w-full px-6 py-4 rounded-xl backdrop-blur-md bg-black/80 border border-white/10 text-center shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-sm font-semibold uppercase tracking-wider text-white mb-1">
          {phase === GamePhase.CALM
            ? 'Tareas Domésticas'
            : phase === GamePhase.GLITCH
            ? 'Anomalía en el Pasillo'
            : 'Defensa de la Casa'}
        </h1>

        <p className="text-xs text-zinc-300">
          {phase === GamePhase.CALM
            ? 'Apaga la estufa y saca la basura de la cocina.'
            : phase === GamePhase.GLITCH
            ? 'Una luz extraña proviene de la puerta del pasillo norte...'
            : 'Defiéndete usando la luz de tu linterna o la pistola.'}
        </p>
      </div>
    </div>
  );
};
