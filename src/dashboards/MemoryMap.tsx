import { useEffect, useRef } from 'react';
import { useKernelStore } from '../engine/store';
import { HardDrive } from 'lucide-react';

export function MemoryMap() {
  const { metrics, startListening } = useKernelStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startListening();
  }, [startListening]);

  useEffect(() => {
    if (!metrics || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Handle high-DPI displays and resizing
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

    const numBlocksX = 50;
    const numBlocksY = 30;
    const totalBlocks = numBlocksX * numBlocksY;

    // Ratios
    const usedRatio = metrics.memory_used / metrics.memory_total;
    const usedBlocks = Math.floor(totalBlocks * usedRatio);
    
    // We visually represent swap in the remaining space for effect
    const swapRatio = metrics.swap_total > 0 ? metrics.swap_used / metrics.swap_total : 0;
    const swapBlocks = Math.floor(totalBlocks * swapRatio * 0.5); 

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      
      // Clear background with solid dark slate
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);
      
      t += 0.05;

      const padding = 3;
      const blockW = (w - padding * (numBlocksX + 1)) / numBlocksX;
      const blockH = (h - padding * (numBlocksY + 1)) / numBlocksY;

      for (let y = 0; y < numBlocksY; y++) {
        for (let x = 0; x < numBlocksX; x++) {
          const i = y * numBlocksX + x;
          
          let fillStyle = '#0f172a'; // free memory
          
          const isFlickering = Math.random() > 0.98;

          if (i < usedBlocks) {
            // Active memory blocks
            const intensity = Math.sin(t + i * 0.1) * 0.3 + 0.7;
            fillStyle = isFlickering ? '#a5f3fc' : `rgba(6, 182, 212, ${intensity})`;
          } else if (i < usedBlocks + swapBlocks) {
             // Swap memory
             const intensity = Math.sin(t * 0.5 + i * 0.2) * 0.2 + 0.8;
             fillStyle = `rgba(217, 70, 239, ${intensity})`;
          }

          ctx.fillStyle = fillStyle;
          
          // Draw rect
          const rectX = padding + x * (blockW + padding);
          const rectY = padding + y * (blockH + padding);
          
          ctx.beginPath();
          ctx.roundRect(rectX, rectY, blockW, blockH, 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [metrics]);

  if (!metrics) {
    return (
      <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner flex flex-col items-center justify-center relative overflow-hidden group">
        <HardDrive className="w-24 h-24 text-cyan-500/20 animate-pulse mb-6" />
        <h2 className="text-2xl font-light text-white mb-2 z-10">Initializing Memory Matrix...</h2>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner relative overflow-hidden flex flex-col p-6">
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-500/30">
          <HardDrive size={20} />
        </div>
        <div>
          <h3 className="text-lg text-slate-200 font-medium">Physical Memory Matrix</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            BLOCK PAGE SIZE: {(metrics.memory_total / 1024 / 1024 / 1500).toFixed(1)} MB
          </p>
        </div>
        <div className="ml-auto text-sm text-slate-400 font-mono flex gap-6 border border-slate-800 bg-slate-950/50 p-2 rounded-lg">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></div> Active
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-slate-800"></div> Free
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-fuchsia-500 shadow-[0_0_8px_#d946ef]"></div> Swap
           </div>
        </div>
      </div>

      <div className="flex-1 w-full relative rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
