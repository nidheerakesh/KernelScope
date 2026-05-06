import { useEffect, useRef } from 'react';
import { Network } from 'lucide-react';
import { useNetworkStore, NetworkConnection } from '../engine/networkStore';

const PROTOCOL_COLORS: Record<string, string> = {
  TCP: '#22d3ee',
  UDP: '#a78bfa',
  UNIX: '#f59e0b',
  PIPE: '#4ade80',
};

const STATE_GLOW: Record<string, string> = {
  ESTABLISHED: 'rgba(34,211,238,0.6)',
  LISTEN: 'rgba(74,222,128,0.6)',
  TIME_WAIT: 'rgba(100,116,139,0.4)',
  CLOSE_WAIT: 'rgba(239,68,68,0.4)',
  SYN_SENT: 'rgba(251,191,36,0.5)',
  CONNECTED: 'rgba(167,139,250,0.5)',
};

export function NetworkMap() {
  const { connections, startListening } = useNetworkStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startListening();
  }, [startListening]);

  useEffect(() => {
    if (!canvasRef.current || !connections.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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

    let animFrame: number;
    let t = 0;

    // Group connections by process
    const processGroups = new Map<string, NetworkConnection[]>();
    connections.forEach(c => {
      const key = `${c.pid}:${c.process_name}`;
      if (!processGroups.has(key)) processGroups.set(key, []);
      processGroups.get(key)!.push(c);
    });

    const processes = Array.from(processGroups.entries());

    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      t += 0.02;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) * 0.32;

      // Draw central hub
      ctx.beginPath();
      ctx.arc(centerX, centerY, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowColor = 'rgba(34,211,238,0.5)';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('KERNEL', centerX, centerY - 5);
      ctx.fillStyle = '#64748b';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText('NET STACK', centerX, centerY + 7);

      // Draw each process as a node around the ring
      processes.forEach(([_key, conns], i) => {
        const angle = (i / processes.length) * Math.PI * 2 - Math.PI / 2;
        const wobble = Math.sin(t * 2 + i) * 3;
        const px = centerX + Math.cos(angle) * (radius + wobble);
        const py = centerY + Math.sin(angle) * (radius + wobble);
        const nodeRadius = 12 + conns.length * 2;

        // Draw connections (lines from center to node)
        conns.forEach((conn, ci) => {
          const color = PROTOCOL_COLORS[conn.protocol] || '#64748b';
          const glow = STATE_GLOW[conn.state] || 'rgba(100,116,139,0.3)';

          // Animated dash offset for data flow
          const dashOffset = t * 80 + ci * 20;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);

          // Curved bezier for visual interest
          const cpx = (centerX + px) / 2 + Math.sin(angle + Math.PI / 2) * 30;
          const cpy = (centerY + py) / 2 + Math.cos(angle + Math.PI / 2) * 30;
          ctx.quadraticCurveTo(cpx, cpy, px, py);

          ctx.strokeStyle = color;
          ctx.lineWidth = conn.state === 'ESTABLISHED' ? 1.5 : 0.8;
          ctx.setLineDash([4, 6]);
          ctx.lineDashOffset = -dashOffset;
          ctx.globalAlpha = conn.state === 'ESTABLISHED' ? 0.7 : 0.3;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;

          // Flowing particle on the line
          const particleT = ((t * 0.5 + ci * 0.3) % 1);
          const particleX = (1 - particleT) * (1 - particleT) * centerX + 2 * (1 - particleT) * particleT * cpx + particleT * particleT * px;
          const particleY = (1 - particleT) * (1 - particleT) * centerY + 2 * (1 - particleT) * particleT * cpy + particleT * particleT * py;

          ctx.beginPath();
          ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowColor = glow;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // Draw process node
        ctx.beginPath();
        ctx.arc(px, py, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        const mainColor = PROTOCOL_COLORS[conns[0]?.protocol] || '#64748b';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Process name label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(conns[0]?.process_name || '', px, py - 4);

        // PID label
        ctx.fillStyle = '#64748b';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`PID:${conns[0]?.pid}`, px, py + 8);

        // Connection count badge
        ctx.beginPath();
        ctx.arc(px + nodeRadius - 2, py - nodeRadius + 2, 7, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(`${conns.length}`, px + nodeRadius - 2, py - nodeRadius + 3);
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrame);
    };
  }, [connections]);

  if (!connections.length) {
    return (
      <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner flex flex-col items-center justify-center">
        <Network className="w-24 h-24 text-violet-500/20 animate-pulse mb-6" />
        <h2 className="text-2xl font-light text-white mb-2">Scanning Network Topology...</h2>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner relative overflow-hidden flex flex-col p-6">
      <div className="flex items-center gap-3 mb-4 relative z-10 flex-shrink-0">
        <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.3)] border border-violet-500/30">
          <Network size={20} />
        </div>
        <div>
          <h3 className="text-lg text-slate-200 font-medium">IPC & Network Topology</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Socket / Pipe / Unix Domain Connections
          </p>
        </div>
        <div className="ml-auto flex gap-4 text-xs font-mono border border-slate-800 bg-slate-950/50 p-2 rounded-lg">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></div> TCP</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_5px_#a78bfa]"></div> UDP</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_#f59e0b]"></div> UNIX</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_#4ade80]"></div> PIPE</div>
        </div>
      </div>

      <div className="flex-1 w-full relative rounded-lg overflow-hidden border border-slate-800/80 bg-[#020617]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
