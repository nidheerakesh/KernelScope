import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, Lightbulb } from 'lucide-react';

interface Concept {
  title: string;
  category: string;
  description: string;
  details: string[];
  related: string[];
}

const OS_CONCEPTS: Concept[] = [
  {
    title: 'Context Switch',
    category: 'CPU Scheduling',
    description: 'A context switch occurs when the kernel saves the state of the currently running process and restores the state of another process to run on the CPU.',
    details: [
      'The kernel saves registers, program counter, and stack pointer to the PCB (Process Control Block)',
      'The scheduler selects the next process from the ready queue',
      'The new process\'s state is restored from its PCB',
      'Typical context switch takes 1-10 microseconds on modern hardware',
      'Too many context switches cause "thrashing" — the CPU spends more time switching than executing',
    ],
    related: ['Process States', 'Scheduler', 'PCB', 'Ready Queue'],
  },
  {
    title: 'Virtual Memory',
    category: 'Memory Management',
    description: 'Virtual memory gives each process the illusion of having its own large, contiguous address space, even though physical memory (RAM) is shared and limited.',
    details: [
      'Each process gets a virtual address space (e.g., 0x0000 to 0xFFFF...)',
      'The MMU (Memory Management Unit) translates virtual → physical addresses',
      'Pages not in RAM are stored on disk (swap space)',
      'A page fault occurs when the process accesses a page not currently in RAM',
      'Demand paging loads pages only when first accessed, saving RAM',
    ],
    related: ['Page Table', 'TLB', 'Page Fault', 'Swap', 'MMU'],
  },
  {
    title: 'Process States',
    category: 'Process Management',
    description: 'Every process in Linux transitions between well-defined states during its lifecycle, managed by the kernel scheduler.',
    details: [
      'NEW → READY: Process created, waiting for CPU',
      'READY → RUNNING: Scheduler dispatches process to a CPU core',
      'RUNNING → WAITING: Process blocks on I/O or lock',
      'RUNNING → READY: Timer interrupt preempts process (time slice expired)',
      'RUNNING → TERMINATED: Process calls exit() or receives SIGKILL',
      'ZOMBIE: Process finished but parent hasn\'t called wait() yet',
    ],
    related: ['fork()', 'exec()', 'wait()', 'Zombie Process', 'Orphan Process'],
  },
  {
    title: 'Deadlock',
    category: 'Synchronization',
    description: 'A deadlock occurs when two or more processes are each waiting for a resource held by the other, creating a circular dependency where none can proceed.',
    details: [
      'Four conditions must ALL hold: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait',
      'The Dining Philosophers problem is the classic deadlock illustration',
      'Prevention: Break one of the four conditions (e.g., impose resource ordering)',
      'Detection: Build a Resource Allocation Graph and check for cycles',
      'Recovery: Kill a process, preempt a resource, or rollback',
    ],
    related: ['Mutex', 'Semaphore', 'Resource Allocation Graph', 'Banker\'s Algorithm'],
  },
  {
    title: 'System Calls',
    category: 'Kernel Interface',
    description: 'System calls are the programmatic interface between user-space applications and the Linux kernel. They are the ONLY way a process can request services from the kernel.',
    details: [
      'User code triggers a syscall via a special CPU instruction (syscall/sysenter)',
      'The CPU switches from Ring 3 (user) to Ring 0 (kernel)',
      'The kernel handles the request (e.g., read file, allocate memory)',
      'Control returns to user-space with the result',
      'Common syscalls: open(), read(), write(), fork(), exec(), mmap(), ioctl()',
    ],
    related: ['Ring 0', 'Ring 3', 'ABI', 'glibc Wrapper', 'strace'],
  },
  {
    title: 'IPC (Inter-Process Communication)',
    category: 'Process Communication',
    description: 'IPC mechanisms allow separate processes to exchange data and synchronize their actions. Linux provides multiple IPC primitives for different use cases.',
    details: [
      'Pipes: Unidirectional byte stream between parent/child (pipe())',
      'Named Pipes (FIFOs): Pipes accessible via the filesystem',
      'UNIX Domain Sockets: Bidirectional, high-speed local communication',
      'Shared Memory: Fastest IPC — processes map the same physical pages',
      'Signals: Lightweight async notifications (SIGTERM, SIGKILL, SIGSEGV)',
      'Message Queues: Structured message passing via the kernel',
    ],
    related: ['pipe()', 'socket()', 'shmget()', 'kill()', 'mmap()'],
  },
  {
    title: 'Page Fault',
    category: 'Memory Management',
    description: 'A page fault is a hardware exception raised when a process accesses a virtual memory page that is not currently mapped to physical RAM.',
    details: [
      'Minor fault: Page exists but isn\'t in the page table (e.g., first access) — handled quickly',
      'Major fault: Page must be loaded from disk (swap) — causes significant delay',
      'Invalid fault: Process accesses unmapped memory → Segmentation Fault (SIGSEGV)',
      'Copy-on-Write faults: Triggered when a forked process writes to a shared page',
      'On modern systems, minor faults are ~1µs, major faults can be ~10ms (10,000x slower)',
    ],
    related: ['Virtual Memory', 'Swap', 'Copy-on-Write', 'SIGSEGV', 'Demand Paging'],
  },
  {
    title: 'Linux Scheduler (CFS)',
    category: 'CPU Scheduling',
    description: 'The Completely Fair Scheduler (CFS) is the default Linux process scheduler. It models an "ideal, precise multitasking CPU" that gives each task an equal share of CPU time.',
    details: [
      'CFS uses a red-black tree ordered by "virtual runtime" (vruntime)',
      'The task with the smallest vruntime gets the CPU next',
      'Higher-priority (nice) tasks accumulate vruntime more slowly',
      'CFS replaced the O(1) scheduler in Linux 2.6.23',
      'SCHED_FIFO and SCHED_RR are real-time scheduling policies that bypass CFS',
    ],
    related: ['vruntime', 'nice', 'Red-Black Tree', 'Time Slice', 'Preemption'],
  },
];

export function EducationalPanel() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  return (
    <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner flex flex-col overflow-hidden relative">
      <div className="flex items-center gap-3 p-6 pb-4 flex-shrink-0">
        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/30">
          <BookOpen size={20} />
        </div>
        <div>
          <h3 className="text-lg text-slate-200 font-medium">OS Concept Explorer</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Interactive Operating Systems Reference
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Concept List */}
        <div className="w-80 border-r border-slate-800/50 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          {OS_CONCEPTS.map((concept, i) => (
            <button
              key={i}
              onClick={() => setSelectedConcept(concept)}
              className={`w-full text-left p-3 rounded-xl mb-2 transition-all duration-200 border group ${
                selectedConcept?.title === concept.title
                  ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]'
                  : 'border-slate-800/50 bg-slate-800/20 hover:bg-slate-800/40 hover:border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${selectedConcept?.title === concept.title ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {concept.title}
                </span>
                <ChevronRight size={14} className={`transition-transform ${selectedConcept?.title === concept.title ? 'text-emerald-400 translate-x-0' : 'text-slate-600 -translate-x-1 group-hover:translate-x-0'}`} />
              </div>
              <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">{concept.category}</span>
            </button>
          ))}
        </div>

        {/* Concept Detail */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          <AnimatePresence mode="wait">
            {selectedConcept ? (
              <motion.div
                key={selectedConcept.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    {selectedConcept.category}
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-white mb-3">{selectedConcept.title}</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 border-l-2 border-emerald-500/30 pl-4">
                  {selectedConcept.description}
                </p>

                <h4 className="text-xs font-mono uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-400" /> Key Details
                </h4>
                <ul className="space-y-2 mb-6">
                  {selectedConcept.details.map((detail, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-3 text-sm text-slate-300"
                    >
                      <span className="text-emerald-500 flex-shrink-0 mt-0.5">▸</span>
                      <span className="font-mono text-xs leading-relaxed">{detail}</span>
                    </motion.li>
                  ))}
                </ul>

                <h4 className="text-xs font-mono uppercase text-slate-500 tracking-widest mb-3">Related Concepts</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedConcept.related.map((tag, i) => (
                    <span key={i} className="text-xs font-mono px-2.5 py-1 rounded-lg border border-slate-700/50 bg-slate-800/30 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors cursor-default">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
                <p className="text-slate-500 text-sm">Select a concept from the list to explore</p>
                <p className="text-slate-600 text-xs mt-1 font-mono">8 core OS topics available</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
