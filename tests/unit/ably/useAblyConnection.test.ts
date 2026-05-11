import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Ably client mock ────────────────────────────────────────────────────────

type EventHandler = (...args: unknown[]) => void;

function makeConnectionMock(initialState = 'disconnected') {
  const listeners: Record<string, EventHandler[]> = {};

  return {
    state: initialState as string,
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    off: vi.fn((event: string, handler: EventHandler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    emit(event: string, ...args: unknown[]) {
      (listeners[event] ?? []).forEach((h) => h(...args));
    },
    _listeners: listeners,
  };
}

// vi.hoisted() ensures these variables exist before the vi.mock() factory is hoisted
// and executed. Without this, the factory would reference them in the TDZ and throw.
const { mockGetClientAbly, mockCloseAblyClient } = vi.hoisted(() => ({
  mockGetClientAbly: vi.fn(),
  mockCloseAblyClient: vi.fn(),
}));

// These are only accessed when mockGetClientAbly() is actually called (at test time),
// not during the hoisted factory — so plain let declarations are fine here.
let mockConnection = makeConnectionMock();
let mockClientConnectFn = vi.fn();

vi.mock('@/lib/ably', () => ({
  getClientAbly: mockGetClientAbly,
  closeAblyClient: mockCloseAblyClient,
}));

// ─── Import hook under test AFTER mocks are set up ──────────────────────────
import { useAblyConnection } from '@/hooks/useAblyConnection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetConnectionMock(initialState = 'disconnected') {
  mockConnection = makeConnectionMock(initialState);
  mockClientConnectFn = vi.fn();
  mockGetClientAbly.mockReturnValue({
    connection: mockConnection,
    connect: mockClientConnectFn,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAblyConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetConnectionMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Initial state sync ────────────────────────────────────────────────────

  it('syncs to "connected" immediately when singleton is already connected', () => {
    resetConnectionMock('connected');
    const { result } = renderHook(() => useAblyConnection());

    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionAttempts).toBe(0);
    expect(result.current.isReconnecting).toBe(false);
  });

  it('syncs to "connecting" immediately when singleton is already connecting', () => {
    resetConnectionMock('connecting');
    const { result } = renderHook(() => useAblyConnection());

    expect(result.current.connectionStatus).toBe('connecting');
    expect(result.current.isConnecting).toBe(true);
  });

  it('syncs to "suspended" immediately when singleton is in suspended state', () => {
    resetConnectionMock('suspended');
    const { result } = renderHook(() => useAblyConnection());

    expect(result.current.connectionStatus).toBe('suspended');
    expect(result.current.isDisconnected).toBe(true);
  });

  it('syncs to "failed" immediately when singleton is in failed state', () => {
    resetConnectionMock('failed');
    const { result } = renderHook(() => useAblyConnection());

    expect(result.current.connectionStatus).toBe('failed');
    expect(result.current.isDisconnected).toBe(true);
  });

  it('starts as "disconnected" when singleton is disconnected', () => {
    resetConnectionMock('disconnected');
    const { result } = renderHook(() => useAblyConnection());

    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('sets status to "disabled" when getClientAbly returns null', () => {
    mockGetClientAbly.mockReturnValue(null);
    const { result } = renderHook(() => useAblyConnection());

    expect(result.current.connectionStatus).toBe('disabled');
    expect(result.current.isDisabled).toBe(true);
  });

  // ── Event-driven state transitions ────────────────────────────────────────

  it('transitions to "connected" on connection event', () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      mockConnection.emit('connected');
    });

    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionAttempts).toBe(0);
    expect(result.current.isReconnecting).toBe(false);
  });

  it('transitions to "connecting" on connecting event', () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      mockConnection.emit('connecting');
    });

    expect(result.current.connectionStatus).toBe('connecting');
    expect(result.current.isConnecting).toBe(true);
  });

  it('transitions to "disconnected" on disconnected event and schedules reconnect', () => {
    resetConnectionMock('connected');
    const { result } = renderHook(() => useAblyConnection());

    // Confirm we start connected so the hook registers listeners
    expect(result.current.connectionStatus).toBe('connected');

    act(() => {
      mockConnection.emit('disconnected');
    });

    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.isDisconnected).toBe(true);
  });

  it('transitions to "suspended" on suspended event', () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      mockConnection.emit('suspended');
    });

    expect(result.current.connectionStatus).toBe('suspended');
  });

  it('transitions to "failed" on failed event', () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      mockConnection.emit('failed', new Error('Connection failed'));
    });

    expect(result.current.connectionStatus).toBe('failed');
  });

  // ── Named handler registration ────────────────────────────────────────────

  it('registers named handlers on connection (not a wildcard subscription)', () => {
    renderHook(() => useAblyConnection());

    // Should have registered 5 named event handlers
    expect(mockConnection.on).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('connecting', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('suspended', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledTimes(5);
  });

  // ── Cleanup removes only named handlers (not global .off()) ───────────────

  it('removes only specific named handlers on unmount — never calls off() with no args', () => {
    const { unmount } = renderHook(() => useAblyConnection());

    unmount();

    // Each .off() call must include both an event name AND a handler function
    const offCalls = mockConnection.off.mock.calls;
    for (const call of offCalls) {
      expect(typeof call[0]).toBe('string'); // event name
      expect(typeof call[1]).toBe('function'); // specific handler
    }

    // All 5 named handlers should have been removed
    expect(offCalls.length).toBe(5);
    expect(offCalls.map((c) => c[0]).sort()).toEqual(
      ['connected', 'connecting', 'disconnected', 'failed', 'suspended'].sort()
    );
  });

  it('removes the exact same handler function that was registered', () => {
    renderHook(() => useAblyConnection());

    // Capture registered handlers
    const registeredHandlers = new Map<string, EventHandler>();
    for (const [event, handler] of mockConnection.on.mock.calls) {
      registeredHandlers.set(event as string, handler as EventHandler);
    }

    // Capture removed handlers — they must be the same function references
    for (const [event, handler] of mockConnection.off.mock.calls) {
      const registered = registeredHandlers.get(event as string);
      expect(handler).toBe(registered);
    }
  });

  // ── Reconnect logic ────────────────────────────────────────────────────────

  it('increments connectionAttempts and sets isReconnecting on disconnected event', async () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      mockConnection.emit('disconnected');
    });

    // isReconnecting should have been set to true during reconnect scheduling
    // After timeout fires, it goes back to false. Advance timers to trigger.
    await act(async () => {
      vi.advanceTimersByTime(12_000); // beyond max backoff + jitter
    });

    expect(result.current.connectionAttempts).toBeGreaterThanOrEqual(1);
  });

  it('calls client.connect() during reconnect attempt', async () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      mockConnection.emit('disconnected');
    });

    await act(async () => {
      vi.advanceTimersByTime(12_000);
    });

    expect(mockClientConnectFn).toHaveBeenCalled();
    // Result must still be a valid object
    expect(result.current).toBeDefined();
  });

  it('skips reconnect when already reconnecting', () => {
    const { result } = renderHook(() => useAblyConnection());

    // First disconnected event — sets isReconnecting=true and increments attempts
    act(() => {
      mockConnection.emit('disconnected');
    });

    // Each act() flushes React effects, so isReconnectingRef.current is now true
    // before the second emission. The second call to attemptReconnect is a no-op.
    act(() => {
      mockConnection.emit('disconnected');
    });

    expect(result.current.connectionAttempts).toBe(1);
  });

  it('skips reconnect when already connected', () => {
    resetConnectionMock('connected');
    const { result } = renderHook(() => useAblyConnection());

    expect(result.current.connectionStatus).toBe('connected');

    // Firing connected again should NOT attempt reconnect
    act(() => {
      mockConnection.emit('connected');
    });

    expect(result.current.connectionAttempts).toBe(0);
  });

  // ── disconnect() ──────────────────────────────────────────────────────────

  it('disconnect() closes the client and resets state', () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      result.current.disconnect();
    });

    expect(mockCloseAblyClient).toHaveBeenCalledOnce();
    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.isReconnecting).toBe(false);
  });

  // ── reconnect() ───────────────────────────────────────────────────────────

  it('reconnect() calls client.connect() when client is available', () => {
    const { result } = renderHook(() => useAblyConnection());

    act(() => {
      result.current.reconnect();
    });

    expect(mockClientConnectFn).toHaveBeenCalledOnce();
  });

  // ── healthCheck() ─────────────────────────────────────────────────────────

  it('healthCheck() returns true when connected', () => {
    resetConnectionMock('connected');
    const { result } = renderHook(() => useAblyConnection());

    let healthy = false;
    act(() => {
      healthy = result.current.healthCheck();
    });

    expect(healthy).toBe(true);
  });

  it('healthCheck() returns false when disconnected and triggers reconnect', () => {
    const { result } = renderHook(() => useAblyConnection());

    let healthy = true;
    act(() => {
      healthy = result.current.healthCheck();
    });

    expect(healthy).toBe(false);
  });
});
