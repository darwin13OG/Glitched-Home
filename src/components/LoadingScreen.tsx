import React, { useState, useEffect, useRef } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Iniciando entorno...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const statuses = [
      'Iniciando entorno 3D...',
      'Cargando iluminación y texturas...',
      'Generando nivel Backrooms...',
      'Preparando interfaz...',
      'Carga completada.',
    ];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 12) + 12;

      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setStatusText(statuses[statuses.length - 1]);
        clearInterval(interval);

        // Auto transition seamlessly to main menu with smooth fade-out
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            onCompleteRef.current();
          }, 500);
        }, 300);
      } else {
        setProgress(currentProgress);
        const index = Math.min(
          Math.floor((currentProgress / 100) * (statuses.length - 1)),
          statuses.length - 2
        );
        setStatusText(statuses[index]);
      }
    }, 120);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[60] bg-[#08080a] flex flex-col items-center justify-center p-8 select-none font-sans overflow-hidden text-zinc-100 transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* VHS SCANLINES & OVERLAY */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
          backgroundSize: '100% 4px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,rgba(0,0,0,0.95)_80%)] pointer-events-none" />

      {/* CENTER GLITCHED VHS LOGO */}
      <div className="relative z-20 my-auto flex flex-col items-center text-center space-y-8 max-w-md w-full">
        {/* Modern Glitched Logo with VHS Slices */}
        <div className="relative group my-2">
          <div className="relative inline-block font-sans">
            {/* Base Text */}
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-zinc-100 font-sans leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              GLITCHED<br />HOME
            </h1>

            {/* VHS Slice Layer 1 (Red Offset Glitch) */}
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-red-500/70 font-sans leading-none absolute top-0 left-0 pointer-events-none mix-blend-screen animate-vhs-slice-1">
              GLITCHED<br />HOME
            </h1>

            {/* VHS Slice Layer 2 (Cyan Offset Glitch) */}
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-cyan-400/70 font-sans leading-none absolute top-0 left-0 pointer-events-none mix-blend-screen animate-vhs-slice-2">
              GLITCHED<br />HOME
            </h1>
          </div>
        </div>

        {/* Dark Progress Bar */}
        <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.9)]">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-300 truncate max-w-[220px]">{statusText}</span>
            <span className="text-zinc-100 font-bold">{progress}%</span>
          </div>

          {/* Progress fill */}
          <div className="w-full bg-zinc-800/90 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
            <div
              className="bg-gradient-to-r from-zinc-500 via-zinc-300 to-white h-full rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
