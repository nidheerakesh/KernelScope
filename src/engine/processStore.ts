import { create } from 'zustand';

export interface ProcessInfo {
  pid: number;
  ppid: number | null;
  name: string;
  cpu_usage: number;
  memory: number;
  status: string;
}

interface ProcessStore {
  processes: ProcessInfo[];
  startListening: () => void;
}

let isListening = false;

export const useProcessStore = create<ProcessStore>((set) => ({
  processes: [],
  startListening: async () => {
    if (isListening) return;
    isListening = true;

    const { listen } = await import('@tauri-apps/api/event');
    await listen<ProcessInfo[]>('process-metrics', (event) => {
      set({ processes: event.payload });
    });
  }
}));
