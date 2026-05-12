import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Ably context mock ───────────────────────────────────────────────────────

type ChannelCallback = (msg: unknown) => void;

let subscribeResolve: ((cleanup: () => void) => void) | null = null;
let subscribePromise: Promise<() => void> | null = null;
let mockSubscribeToChannel: ReturnType<typeof vi.fn>;

function makeContextMock(subscribeDelay = 0) {
  mockSubscribeToChannel = vi.fn((_channel: string, _event: string, _cb: ChannelCallback) => {
    subscribePromise = new Promise<() => void>((resolve) => {
      subscribeResolve = resolve;
      if (subscribeDelay === 0) {
        resolve(vi.fn() as () => void);
      } else {
        setTimeout(() => resolve(vi.fn() as () => void), subscribeDelay);
      }
    });
    return subscribePromise;
  });

  return { subscribeToChannel: mockSubscribeToChannel };
}

vi.mock('@/contexts/ably/context', () => ({
  useAbly: vi.fn(() => makeContextMock()),
}));

import { useAbly } from '@/contexts/ably/context';

// ─── Import hook after mocks ─────────────────────────────────────────────────
import { useAblyChannel } from '@/contexts/ably/useAblyHooks';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAblyChannel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    subscribeResolve = null;
    subscribePromise = null;
    vi.mocked(useAbly).mockReturnValue(makeContextMock() as unknown as ReturnType<typeof useAbly>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Skips invalid / missing inputs ────────────────────────────────────────

  it('does nothing when channelName is null', () => {
    renderHook(() => useAblyChannel(null, 'my-event', vi.fn()));
    expect(mockSubscribeToChannel).not.toHaveBeenCalled();
  });

  it('does nothing when eventName is null', () => {
    renderHook(() => useAblyChannel('user:123', null, vi.fn()));
    expect(mockSubscribeToChannel).not.toHaveBeenCalled();
  });

  it('does nothing when channelName is undefined', () => {
    renderHook(() => useAblyChannel(undefined, 'my-event', vi.fn()));
    expect(mockSubscribeToChannel).not.toHaveBeenCalled();
  });

  it('does nothing for a channel name containing "null" (invalid per isInvalidChannelName)', () => {
    // isInvalidChannelName blocks names containing 'null', 'undefined', ':null:', ':undefined:',
    // or ending with ':null' / ':undefined'. It does NOT block underscore-prefixed names.
    renderHook(() => useAblyChannel('job:null', 'my-event', vi.fn()));
    expect(mockSubscribeToChannel).not.toHaveBeenCalled();
  });

  it('does nothing for a channel name containing "undefined"', () => {
    renderHook(() => useAblyChannel('user:undefined', 'my-event', vi.fn()));
    expect(mockSubscribeToChannel).not.toHaveBeenCalled();
  });

  // ── Successful subscription ────────────────────────────────────────────────

  it('calls subscribeToChannel with the correct arguments', async () => {
    const cb = vi.fn();
    renderHook(() => useAblyChannel('user:abc', 'notification', cb));

    await vi.runAllTimersAsync();

    expect(mockSubscribeToChannel).toHaveBeenCalledWith('user:abc', 'notification', expect.any(Function));
  });

  it('forwards messages to the callback', async () => {
    const cb = vi.fn();
    renderHook(() => useAblyChannel('job:xyz', 'status-changed', cb));

    await vi.runAllTimersAsync();

    // The context's subscribeToChannel receives a wrapped callback — invoke it
    const wrappedCb = mockSubscribeToChannel.mock.calls[0][2] as ChannelCallback;
    wrappedCb({ data: 'test-payload' });

    expect(cb).toHaveBeenCalledWith({ data: 'test-payload' });
  });

  // ── Cleanup invokes the unsubscribe function ──────────────────────────────

  it('calls the unsubscribe function returned by subscribeToChannel on unmount', async () => {
    const unsubscribeFn = vi.fn();
    mockSubscribeToChannel.mockResolvedValue(unsubscribeFn);

    const { unmount } = renderHook(() => useAblyChannel('job:xyz', 'update', vi.fn()));

    // Wait for the async subscribe to resolve
    await vi.runAllTimersAsync();

    unmount();

    expect(unsubscribeFn).toHaveBeenCalledOnce();
  });

  // ── Cancelled-flag race condition ─────────────────────────────────────────

  it('calls the unsubscribe immediately if the effect is cleaned up before subscribe resolves', async () => {
    let resolveSubscription!: (fn: () => void) => void;
    const latentUnsubscribe = vi.fn();

    mockSubscribeToChannel.mockReturnValue(
      new Promise<() => void>((resolve) => {
        resolveSubscription = resolve;
      })
    );

    vi.mocked(useAbly).mockReturnValue({
      subscribeToChannel: mockSubscribeToChannel,
    } as unknown as ReturnType<typeof useAbly>);

    const { unmount } = renderHook(() => useAblyChannel('conversation:1', 'message', vi.fn()));

    // Unmount before the subscription resolves — this sets cancelled = true
    unmount();

    // Now resolve the subscription and flush the microtask queue.
    // vi.runAllTimersAsync() is used rather than a raw setTimeout-based flushPromises()
    // because fake timers are active and would block a setTimeout(resolve, 0).
    resolveSubscription(latentUnsubscribe);
    await vi.runAllTimersAsync();

    // The hook must have detected the cancellation and immediately called the cleanup
    expect(latentUnsubscribe).toHaveBeenCalledOnce();
  });

  it('does not call the late-arriving unsubscribe twice after clean unmount', async () => {
    const earlyUnsubscribe = vi.fn();
    mockSubscribeToChannel.mockResolvedValue(earlyUnsubscribe);

    vi.mocked(useAbly).mockReturnValue({
      subscribeToChannel: mockSubscribeToChannel,
    } as unknown as ReturnType<typeof useAbly>);

    const { unmount } = renderHook(() => useAblyChannel('job:1', 'update', vi.fn()));

    await vi.runAllTimersAsync();
    unmount();

    // Called once only, not twice
    expect(earlyUnsubscribe).toHaveBeenCalledTimes(1);
  });

  // ── Re-subscription on dependency change ─────────────────────────────────

  it('re-subscribes when channelName changes', async () => {
    let channelName = 'user:abc';
    const { rerender } = renderHook(() => useAblyChannel(channelName, 'notification', vi.fn()));

    await vi.runAllTimersAsync();
    expect(mockSubscribeToChannel).toHaveBeenCalledTimes(1);
    expect(mockSubscribeToChannel).toHaveBeenLastCalledWith('user:abc', 'notification', expect.any(Function));

    channelName = 'user:xyz';
    rerender();
    await vi.runAllTimersAsync();

    expect(mockSubscribeToChannel).toHaveBeenCalledTimes(2);
    expect(mockSubscribeToChannel).toHaveBeenLastCalledWith('user:xyz', 'notification', expect.any(Function));
  });

  it('re-subscribes when eventName changes', async () => {
    let eventName = 'event-a';
    const { rerender } = renderHook(() => useAblyChannel('job:1', eventName, vi.fn()));

    await vi.runAllTimersAsync();

    eventName = 'event-b';
    rerender();
    await vi.runAllTimersAsync();

    expect(mockSubscribeToChannel).toHaveBeenCalledTimes(2);
    expect(mockSubscribeToChannel).toHaveBeenLastCalledWith('job:1', 'event-b', expect.any(Function));
  });

  // ── Always uses latest callback (via ref) ─────────────────────────────────

  it('always invokes the latest callback, not the one captured at subscription time', async () => {
    const firstCb = vi.fn();
    const secondCb = vi.fn();
    let cb = firstCb;

    const { rerender } = renderHook(() => useAblyChannel('job:1', 'update', cb));
    await vi.runAllTimersAsync();

    // Change the callback without changing deps — should NOT re-subscribe
    cb = secondCb;
    rerender();
    await vi.runAllTimersAsync();

    expect(mockSubscribeToChannel).toHaveBeenCalledTimes(1); // no re-subscribe

    // Fire the wrapped callback — it should route to secondCb (the updated ref)
    const wrappedCb = mockSubscribeToChannel.mock.calls[0][2] as ChannelCallback;
    wrappedCb({ data: 'hello' });

    expect(firstCb).not.toHaveBeenCalled();
    expect(secondCb).toHaveBeenCalledWith({ data: 'hello' });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('does not throw when subscribeToChannel rejects (logs warning instead)', async () => {
    mockSubscribeToChannel.mockRejectedValue(new Error('Ably error'));

    vi.mocked(useAbly).mockReturnValue({
      subscribeToChannel: mockSubscribeToChannel,
    } as unknown as ReturnType<typeof useAbly>);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => {
      renderHook(() => useAblyChannel('job:1', 'update', vi.fn()));
    }).not.toThrow();

    await vi.runAllTimersAsync();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Channel subscription failed:'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
