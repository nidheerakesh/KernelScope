import { create } from 'zustand';

export interface SystemMetrics {
  cpu_total: number;
  cores: number[];
  memory_used: number;
  memory_total: number;
  swap_used: number;
  swap_total: number;
}

interface KernelStore {
  metrics: SystemMetrics | null;
  history: SystemMetrics[];
  startListening: () => void;
}

let isListening = false;

export const useKernelStore = create<KernelStore>((set) => ({
  metrics: null,
  history: [],
  startListening: async () => {
    if (isListening) return;
    isListening = true;

    const { listen } = await import('@tauri-apps/api/event');
    await listen<SystemMetrics>('system-metrics', (event) => {
      set((state) => {
        const newHistory = [...state.history, event.payload].slice(-60);
        return { metrics: event.payload, history: newHistory };
      });
    });
  }
}));
