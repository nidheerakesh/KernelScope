import { create } from 'zustand';

export interface KernelEvent {
  id: number;
  type: string;
  source: string;
  message: string;
  severity: string;
  timestamp: number;
}

interface KernelEventStore {
  events: KernelEvent[];
  startListening: () => void;
}

let isListening = false;

export const useKernelEventStore = create<KernelEventStore>((set) => ({
  events: [],
  startListening: async () => {
    if (isListening) return;
    isListening = true;

    const { listen } = await import('@tauri-apps/api/event');
    await listen<KernelEvent[]>('kernel-events', (event) => {
      set((state) => ({
        events: [...event.payload, ...state.events].slice(0, 300)
      }));
    });
  }
}));
