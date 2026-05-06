import { useEffect } from 'react';
import { Activity, Cpu, HardDrive } from 'lucide-react';
import { useKernelStore } from '../engine/store';

export function Dashboard() {
  const { metrics, startListening } = useKernelStore();

  useEffect(() => {
    startListening();
  }, [startListening]);

  if (!metrics) {
    return (
      <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner flex flex-col items-center justify-center relative overflow-hidden group">
        <Activity className="w-24 h-24 text-cyan-500/20 animate-pulse mb-6" />
        <h2 className="text-2xl font-light text-white mb-2 z-10">Connecting to Core Engine...</h2>
        <p className="text-slate-500 z-10 text-sm">Awaiting kernel metrics via Tauri IPC</p>
      </div>
    );
  }

  const memPercent = (metrics.memory_used / metrics.memory_total) * 100;

  return (
    <div className="grid grid-cols-2 gap-6 h-full overflow-y-auto pr-2 pb-4">
      {/* CPU Card */}
      <div className="col-span-2 md:col-span-1 rounded-xl border border-slate-800/60 bg-slate-900/40 p-6 flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)] border border-fuchsia-500/30">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-lg text-slate-200 font-medium">CPU Utilization</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{metrics.cores.length} CORES</p>
          </div>
          <div className="ml-auto text-3xl font-light text-fuchsia-400">
            {metrics.cpu_total.toFixed(1)}<span className="text-lg text-fuchsia-500/50">%</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 relative z-10">
          {metrics.cores.map((core, i) => (
            <div key={i} className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                <span>C{i}</span>
                <span className={core > 80 ? 'text-red-400' : 'text-fuchsia-300'}>{core.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ease-out ${core > 80 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]'}`} 
                  style={{ width: `${core}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Memory Card */}
      <div className="col-span-2 md:col-span-1 rounded-xl border border-slate-800/60 bg-slate-900/40 p-6 flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-500/30">
            <HardDrive size={20} />
          </div>
          <div>
            <h3 className="text-lg text-slate-200 font-medium">Virtual Memory</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
              {formatBytes(metrics.memory_used)} / {formatBytes(metrics.memory_total)}
            </p>
          </div>
          <div className="ml-auto text-3xl font-light text-cyan-400">
            {memPercent.toFixed(1)}<span className="text-lg text-cyan-500/50">%</span>
          </div>
        </div>

        <div className="w-full h-6 rounded-md bg-slate-800 mb-4 overflow-hidden border border-slate-700/50 relative">
          <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono text-cyan-100 mix-blend-difference z-10">
            <span>RESIDENT</span>
            <span>{memPercent.toFixed(1)}%</span>
          </div>
          <div 
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all duration-500 ease-out"
            style={{ width: `${memPercent}%` }}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-auto">
           <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Swap Used</div>
              <div className="text-lg font-mono text-slate-300">{formatBytes(metrics.swap_used)}</div>
           </div>
           <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Swap Total</div>
              <div className="text-lg font-mono text-slate-300">{formatBytes(metrics.swap_total)}</div>
           </div>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  const gb = bytes / 1024 / 1024 / 1024;
  return gb.toFixed(2) + ' GB';
}
