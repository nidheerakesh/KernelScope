import { useEffect, useRef } from 'react';
import { TerminalSquare } from 'lucide-react';
import { useSyscallStore } from '../engine/syscallStore';

export function SyscallWaterfall() {
  const { events, startListening } = useSyscallStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startListening();
  }, [startListening]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
    };
    window.addEventListener('resize', resize);
    resize();

    let animationFrameId: number;

    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Dark background with slight fade for trailing effect
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      ctx.font = '13px "JetBrains Mono", monospace';
      
      const rowHeight = 22;
      
      // Draw events (newest at the top)
      events.forEach((ev, i) => {
        const y = 30 + i * rowHeight;
        if (y > h + 50) return; // Outside view

        // Colors based on syscall type or result
        let color = '#22d3ee'; // cyan (default)
        if (ev.ret === -1) color = '#ef4444'; // red (error)
        else if (ev.syscall === 'read' || ev.syscall === 'write' || ev.syscall === 'openat') color = '#a3e635'; // lime
        else if (ev.syscall === 'mmap' || ev.syscall === 'futex' || ev.syscall === 'mprotect') color = '#d946ef'; // fuchsia

        // Fade out older events as they fall down the waterfall
        const alpha = Math.max(0.05, 1 - (i / 40));
        
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        
        // Time
        const time = new Date(ev.timestamp).toISOString().split('T')[1].slice(0, -1);
        
        ctx.fillText(`[${time}]`, 15, y);
        
        // PID
        ctx.fillStyle = '#64748b'; // slate-500
        ctx.fillText(`PID:${ev.pid.toString().padEnd(5)}`, 130, y);
        
        // Syscall
        ctx.fillStyle = color;
        ctx.fillText(`${ev.syscall}(${ev.args})`, 210, y);
        
        // Return
        ctx.fillStyle = ev.ret === -1 ? '#ef4444' : '#94a3b8';
        ctx.fillText(`= ${ev.ret}`, w - 160, y);
        
        // Duration
        ctx.fillStyle = '#475569';
        ctx.fillText(`${(ev.duration_ns / 1000).toFixed(1)}µs`, w - 80, y);
      });

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [events]);

  return (
    <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner relative overflow-hidden flex flex-col p-6">
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)] border border-green-500/30">
          <TerminalSquare size={20} />
        </div>
        <div>
          <h3 className="text-lg text-slate-200 font-medium">Kernel Syscall Matrix</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Intercepting Ring-0 transitions (Simulated via Zustand)
          </p>
        </div>
        <div className="ml-auto text-sm text-slate-400 font-mono flex gap-6 border border-slate-800 bg-slate-950/50 p-2 rounded-lg shadow-inner">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-lime-400 shadow-[0_0_8px_#a3e635]"></div> I/O
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-fuchsia-500 shadow-[0_0_8px_#d946ef]"></div> Memory/Sync
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-red-500 shadow-[0_0_8px_#ef4444]"></div> Error (-1)
           </div>
        </div>
      </div>

      <div className="flex-1 w-full relative rounded-lg overflow-hidden border border-slate-800/80 bg-[#020617] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        {/* CRT Scanline effect overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-40"></div>
      </div>
    </div>
  );
}
