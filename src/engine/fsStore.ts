import { create } from 'zustand';

export interface FsEvent {
  id: number;
  action: string;
  path: string;
  timestamp: number;
}

interface FsStore {
  events: FsEvent[];
  startListening: () => void;
}

let isListening = false;

export const useFsStore = create<FsStore>((set) => ({
  events: [],
  startListening: async () => {
    if (isListening) return;
    isListening = true;

    const { listen } = await import('@tauri-apps/api/event');
    await listen<FsEvent[]>('fs-metrics', (event) => {
      set((state) => ({
        events: [...event.payload, ...state.events].slice(0, 200)
      }));
    });
  }
}));
