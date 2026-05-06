import { useEffect } from 'react';
import { FolderOpen, File, FilePlus, FileMinus, FileSignature, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFsStore, FsEvent } from '../engine/fsStore';

const ActionIcon = ({ action }: { action: FsEvent['action'] }) => {
  switch (action) {
    case 'Create': return <FilePlus className="text-emerald-400" size={16} />;
    case 'Delete': return <FileMinus className="text-red-400" size={16} />;
    case 'Write': case 'Modify': return <FileSignature className="text-amber-400" size={16} />;
    case 'Read': case 'Access': return <Eye className="text-cyan-400" size={16} />;
    default: return <File className="text-slate-400" size={16} />;
  }
};

const ActionColor = (action: FsEvent['action']) => {
  switch (action) {
    case 'Create': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]';
    case 'Delete': return 'text-red-400 border-red-500/30 bg-red-500/10 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]';
    case 'Write': case 'Modify': return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]';
    case 'Read': case 'Access': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]';
    default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
  }
};

export function FilesystemActivity() {
  const { events, startListening } = useFsStore();

  useEffect(() => {
    startListening();
  }, [startListening]);

  return (
    <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner flex flex-col p-6 overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6 relative z-10 flex-shrink-0">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-500/30">
          <FolderOpen size={20} />
        </div>
        <div>
          <h3 className="text-lg text-slate-200 font-medium">Filesystem I/O Explorer</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Intercepting Virtual File System (VFS) Events
          </p>
        </div>
        
        <div className="ml-auto flex gap-4 text-xs font-mono border border-slate-800 bg-slate-950/50 p-2 rounded-lg">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Create</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400"></div> Read</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Write</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400"></div> Delete</div>
        </div>
      </div>

      <div className="flex-1 w-full relative overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
        <div className="flex flex-col gap-2 pb-4">
          <AnimatePresence initial={false}>
            {events.map((ev) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex items-center gap-4 p-3 rounded-xl border ${ActionColor(ev.action)} backdrop-blur-sm`}
              >
                <div className="flex-shrink-0">
                  <ActionIcon action={ev.action} />
                </div>
                
                <div className="w-24 flex-shrink-0 font-mono text-sm uppercase font-bold tracking-widest opacity-80">
                  {ev.action}
                </div>
                
                <div className="flex-1 font-mono text-sm truncate opacity-90">
                  {ev.path}
                </div>
                
                <div className="text-xs font-mono opacity-50 flex-shrink-0 w-24 text-right">
                   --
                </div>
                
                <div className="text-xs font-mono opacity-40 flex-shrink-0 w-24 text-right">
                  {new Date(ev.timestamp).toISOString().split('T')[1].slice(0, -1)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
