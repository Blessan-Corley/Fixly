import { beforeEach, describe, expect, it } from 'vitest';

import { useConnectionStore } from '@/lib/stores/connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      ablyStatus: 'connecting',
      lastConnectedAt: null,
      reconnectAttempts: 0,
    });
  });

  it('sets status to connected', () => {
    useConnectionStore.getState().setAblyStatus('connected');
    expect(useConnectionStore.getState().ablyStatus).toBe('connected');
  });

  it('increments reconnect attempts', () => {
    useConnectionStore.getState().incrementReconnectAttempts();
    useConnectionStore.getState().incrementReconnectAttempts();
    expect(useConnectionStore.getState().reconnectAttempts).toBe(2);
  });

  it('resets reconnect attempts', () => {
    useConnectionStore.getState().incrementReconnectAttempts();
    useConnectionStore.getState().resetReconnectAttempts();
    expect(useConnectionStore.getState().reconnectAttempts).toBe(0);
  });
});
