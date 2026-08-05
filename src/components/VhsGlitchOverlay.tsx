import React, { useEffect, useRef } from 'react';

interface VhsGlitchOverlayProps {
  message?: string;
}

export const VhsGlitchOverlay: React.FC<VhsGlitchOverlayProps> = ({
  message = 'REBOBINANDO CINTA VHS - RETORNO A LA REALIDAD...',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderNoise = () => {
      const w = (canvas.width = window.innerWidth / 2);
      const h = (canvas.height = window.innerHeight / 2);

      const imgData = ctx.createImageData(w, h);
      const buffer = new Uint32Array(imgData.data.buffer);

      for (let i = 0; i < buffer.length; i++) {
        // High-contrast VHS analog noise + chromatic RGB static
        const v = Math.random() < 0.2 ? Math.floor(Math.random() * 255) : 10;
        const color =
          Math.random() < 0.05
            ? 0xff0000ff // Red glitch pixel
            : Math.random() < 0.05
            ? 0x00ff00ff // Green glitch pixel
            : 0xff000000 | (v << 16) | (v << 8) | v;
        buffer[i] = color;
      }

      ctx.putImageData(imgData, 0, 0);

      // Draw horizontal tracking glitch bars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      const barY = Math.random() * h;
      const barH = 5 + Math.random() * 25;
      ctx.fillRect(0, barY, w, barH);

      // Red/Blue chromatic aberration tear
      ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.fillRect(0, (barY + 40) % h, w, 8);

      animId = requestAnimationFrame(renderNoise);
    };

    renderNoise();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden pointer-events-auto select-none">
      {/* Dynamic Animated VHS Noise Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen scale-105"
      />

      {/* Retro CRT Television Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%',
        }}
      />

      {/* Horizontal TV Tracking Glitch Line */}
      <div className="absolute inset-x-0 h-16 bg-white/10 blur-sm animate-pulse top-1/3" />

      {/* Retro VHS On-Screen Display (OSD) UI */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-4 h-4 rounded-full bg-red-600 animate-ping" />
          <span className="font-mono text-xl sm:text-2xl text-red-500 font-extrabold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
            ● REC [VHS 03]
          </span>
        </div>

        <div className="font-mono text-2xl sm:text-4xl font-black text-amber-300 tracking-wider mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.9)] animate-pulse">
          PLAY ⏩ NTSC 60Hz
        </div>

        <div className="bg-black/80 border border-amber-500/50 px-6 py-3 rounded-lg backdrop-blur-md max-w-lg mt-4 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
          <p className="font-mono text-xs sm:text-sm text-zinc-300 tracking-wide uppercase font-semibold">
            {message}
          </p>
        </div>

        <div className="mt-8 font-mono text-[10px] text-emerald-400/80 tracking-widest">
          ERROR DE SEÑAL DE VÍDEO // TELETRANSPORTANDO...
        </div>
      </div>
    </div>
  );
};
