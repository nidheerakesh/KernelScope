import { create } from 'zustand';

export interface SyscallEvent {
  id: number;
  pid: number;
  syscall: string;
  args: string;
  ret: number;
  duration_ns: number;
  timestamp: number;
}

interface SyscallStore {
  events: SyscallEvent[];
  startListening: () => void;
}

let isListening = false;

export const useSyscallStore = create<SyscallStore>((set) => ({
  events: [],
  startListening: async () => {
    if (isListening) return;
    isListening = true;

    const { listen } = await import('@tauri-apps/api/event');
    await listen<SyscallEvent[]>('syscall-metrics', (event) => {
      set((state) => ({
        events: [...event.payload, ...state.events].slice(0, 500)
      }));
    });
  }
}));
