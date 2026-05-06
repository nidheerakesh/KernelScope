import { useEffect } from 'react';
import { Zap, Usb, Terminal, Radio, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKernelEventStore, KernelEvent } from '../engine/kernelEventStore';

const TypeIcon = ({ type }: { type: KernelEvent['type'] }) => {
  switch (type) {
    case 'IRQ': return <Zap size={14} />;
    case 'USB': return <Usb size={14} />;
    case 'DMESG': return <Terminal size={14} />;
    case 'UDEV': return <Radio size={14} />;
    case 'SIGNAL': return <AlertTriangle size={14} />;
    case 'SCHED': return <Clock size={14} />;
    default: return <Zap size={14} />;
  }
};

const severityStyles: Record<string, string> = {
  info: 'border-slate-700/50 bg-slate-800/20 text-slate-300',
  warn: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  error: 'border-red-500/30 bg-red-500/5 text-red-300',
  critical: 'border-red-500/50 bg-red-500/10 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
};

const typeColors: Record<string, string> = {
  IRQ: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  USB: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DMESG: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  UDEV: 'text-green-400 bg-green-500/10 border-green-500/30',
  SIGNAL: 'text-red-400 bg-red-500/10 border-red-500/30',
  SCHED: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
};

const sevBadge: Record<string, string> = {
  info: 'bg-slate-700/50 text-slate-400',
  warn: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
  critical: 'bg-red-500/30 text-red-300 animate-pulse',
};

export function KernelEvents() {
  const { events, startListening } = useKernelEventStore();

  useEffect(() => {
    startListening();
  }, [startListening]);

  return (
    <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner flex flex-col p-6 overflow-hidden relative">
      <div className="flex items-center gap-3 mb-5 relative z-10 flex-shrink-0">
        <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] border border-yellow-500/30">
          <Zap size={20} />
        </div>
        <div>
          <h3 className="text-lg text-slate-200 font-medium">Kernel Event Monitor</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Interrupts • Signals • dmesg • udev • Scheduler
          </p>
        </div>
        <div className="ml-auto flex gap-3 text-[10px] font-mono border border-slate-800 bg-slate-950/50 p-2 rounded-lg">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> IRQ</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"></div> USB</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400"></div> UDEV</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400"></div> SIG</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-400"></div> SCHED</div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {events.map((ev) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${severityStyles[ev.severity]}`}
              >
                {/* Type badge */}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase ${typeColors[ev.type]}`}>
                  <TypeIcon type={ev.type} />
                  {ev.type}
                </div>

                {/* Source */}
                <div className="text-xs font-mono text-slate-500 w-36 truncate flex-shrink-0">
                  {ev.source}
                </div>

                {/* Message */}
                <div className="flex-1 text-xs font-mono truncate">
                  {ev.message}
                </div>

                {/* Severity badge */}
                <div className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${sevBadge[ev.severity]}`}>
                  {ev.severity}
                </div>

                {/* Timestamp */}
                <div className="text-[10px] font-mono text-slate-600 flex-shrink-0 w-20 text-right">
                  {new Date(ev.timestamp).toISOString().split('T')[1].slice(0, 12)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
