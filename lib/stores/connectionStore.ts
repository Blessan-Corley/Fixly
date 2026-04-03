import { create } from 'zustand';

export type AblyStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'suspended';

export type ConnectionStoreState = {
  ablyStatus: AblyStatus;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
  setAblyStatus: (status: AblyStatus) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
};

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  ablyStatus: 'disconnected',
  lastConnectedAt: null,
  reconnectAttempts: 0,
  setAblyStatus: (status: AblyStatus): void => {
    set((state) => ({
      ablyStatus: status,
      lastConnectedAt: status === 'connected' ? new Date() : state.lastConnectedAt,
    }));
  },
  incrementReconnectAttempts: (): void => {
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }));
  },
  resetReconnectAttempts: (): void => {
    set({ reconnectAttempts: 0 });
  },
}));
