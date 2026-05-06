import { create } from 'zustand';

export interface NetworkConnection {
  id: number;
  pid: number;
  process_name: string;
  protocol: string;
  local_addr: string;
  remote_addr: string;
  state: string;
  inode: number;
}

interface NetworkStore {
  connections: NetworkConnection[];
  startListening: () => void;
}

let isListening = false;

export const useNetworkStore = create<NetworkStore>((set) => ({
  connections: [],
  startListening: async () => {
    if (isListening) return;
    isListening = true;

    const { listen } = await import('@tauri-apps/api/event');
    await listen<NetworkConnection[]>('network-metrics', (event) => {
      set({ connections: event.payload });
    });
  }
}));
