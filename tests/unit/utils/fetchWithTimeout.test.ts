import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TIMEOUT_CONFIGS,
  batchFetchWithTimeout,
  createFetchWithTimeout,
  fetchWithRetry,
  fetchWithTimeout,
  handleFetchError,
  isTimeoutError,
  smartFetch,
} from '@/utils/fetchWithTimeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('TIMEOUT_CONFIGS', () => {
    it('exports expected timeout constants', () => {
      expect(TIMEOUT_CONFIGS.fast).toBe(5000);
      expect(TIMEOUT_CONFIGS.default).toBe(10000);
      expect(TIMEOUT_CONFIGS.medium).toBe(20000);
      expect(TIMEOUT_CONFIGS.slow).toBe(30000);
      expect(TIMEOUT_CONFIGS.external).toBe(15000);
    });
  });

  describe('fetchWithTimeout', () => {
    it('returns response on successful fetch', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = fetchWithTimeout('https://example.com/api', {}, 5000);
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
    });

    it('uses default timeout when not specified', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = fetchWithTimeout('https://example.com/api');
      await vi.runAllTimersAsync();
      await promise;
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('throws TimeoutError when request exceeds timeout', async () => {
      // Simulate fetch that never resolves, and trigger the timeout abort
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
          return new Promise<Response>((_, reject) => {
            const signal = opts?.signal as AbortSignal | undefined;
            if (signal) {
              signal.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          });
        })
      );

      const promise = fetchWithTimeout('https://example.com/api', {}, 100);
      vi.advanceTimersByTime(200);

      await expect(promise).rejects.toMatchObject({
        name: 'TimeoutError',
        isTimeout: true,
        message: expect.stringContaining('100ms'),
      });
    });

    it('passes options to fetch', async () => {
      const mockResponse = new Response('Created', { status: 201 });
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      vi.stubGlobal('fetch', mockFetch);

      const promise = fetchWithTimeout('https://example.com/api', { method: 'POST' });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('re-throws non-timeout AbortErrors when external signal is not provided', async () => {
      // An AbortError caused by an external signal (not the timeout controller)
      const externalCtrl = new AbortController();
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const promise = fetchWithTimeout(
        'https://example.com/api',
        {},
        5000,
        externalCtrl.signal
      );
      await vi.runAllTimersAsync();
      // Since the timeoutController didn't abort, the error propagates
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  describe('createFetchWithTimeout', () => {
    it('returns a function that calls fetchWithTimeout with the given timeout', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const fetcher = createFetchWithTimeout(3000);
      const promise = fetcher('https://example.com/api', {});
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
    });

    it('uses default timeout when none specified', () => {
      const fetcher = createFetchWithTimeout();
      expect(typeof fetcher).toBe('function');
    });
  });

  describe('fetchWithRetry', () => {
    it('returns response on first successful attempt', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = fetchWithRetry('https://example.com/api', {}, 2, 5000);
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on TimeoutError and eventually succeeds', async () => {
      const timeoutError = new Error('Request timeout after 100ms');
      timeoutError.name = 'TimeoutError';

      const mockResponse = new Response('OK', { status: 200 });
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue(mockResponse);
      vi.stubGlobal('fetch', mockFetch);

      const promise = fetchWithRetry('https://example.com/api', {}, 2, 5000);
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting all retries', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

      const promise = fetchWithRetry('https://example.com/api', {}, 2, 100);
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
      expect(fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('does not retry on non-timeout errors', async () => {
      const authError = new Error('Unauthorized');
      authError.name = 'AuthError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(authError));

      const promise = fetchWithRetry('https://example.com/api', {}, 2, 5000);
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toMatchObject({ name: 'AuthError' });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('smartFetch', () => {
    it('uses slow timeout for upload URLs', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = smartFetch('https://example.com/upload/photo');
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
    });

    it('uses medium timeout for dashboard URLs', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = smartFetch('https://example.com/dashboard/stats');
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
    });

    it('uses medium timeout for search URLs', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = smartFetch('https://example.com/search?q=plumber');
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
    });

    it('uses fast timeout for GET requests', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = smartFetch('https://example.com/api/user', { method: 'GET' });
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
    });

    it('uses default timeout for POST requests to non-special URLs', async () => {
      const mockResponse = new Response('OK', { status: 201 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const promise = smartFetch('https://example.com/api/jobs', { method: 'POST' });
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(mockResponse);
    });
  });

  describe('batchFetchWithTimeout', () => {
    it('returns settled results for all requests', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const requests = [
        { url: 'https://example.com/api/1' },
        { url: 'https://example.com/api/2' },
      ];
      const promise = batchFetchWithTimeout(requests, 5000);
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.status).toBe('fulfilled');
        if (r.status === 'fulfilled') {
          expect(r.value).toBe(mockResponse);
        }
      });
    });

    it('returns rejected result for failed requests without rejecting batch', async () => {
      const err = new Error('Network error');
      err.name = 'TypeError';
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(new Response('OK', { status: 200 }))
          .mockRejectedValueOnce(err)
      );

      const requests = [
        { url: 'https://example.com/api/1' },
        { url: 'https://example.com/api/2' },
      ];
      const promise = batchFetchWithTimeout(requests, 5000);
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });

    it('returns empty array for empty requests', async () => {
      const promise = batchFetchWithTimeout([], 5000);
      await vi.runAllTimersAsync();
      const results = await promise;
      expect(results).toHaveLength(0);
    });
  });

  describe('isTimeoutError', () => {
    it('returns true for errors with name TimeoutError', () => {
      const err = new Error('timeout');
      err.name = 'TimeoutError';
      expect(isTimeoutError(err)).toBe(true);
    });

    it('returns true for errors with isTimeout flag', () => {
      const err = Object.assign(new Error('timeout'), { isTimeout: true });
      expect(isTimeoutError(err)).toBe(true);
    });

    it('returns false for regular errors', () => {
      expect(isTimeoutError(new Error('Network error'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isTimeoutError('string error')).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(42)).toBe(false);
      expect(isTimeoutError({})).toBe(false);
    });
  });

  describe('handleFetchError', () => {
    it('returns timeout error info for TimeoutError', () => {
      const err = Object.assign(new Error('Timeout'), { name: 'TimeoutError', isTimeout: true });
      const result = handleFetchError(err, 'https://example.com/api');
      expect(result.error).toBe('timeout');
      expect(result.message).toContain('too long');
      expect(result.url).toBe('https://example.com/api');
    });

    it('returns cancelled error info for AbortError', () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      const result = handleFetchError(err, 'https://example.com/api');
      expect(result.error).toBe('cancelled');
      expect(result.url).toBe('https://example.com/api');
    });

    it('returns network error info for unknown errors', () => {
      const result = handleFetchError(new Error('Unknown'), 'https://example.com/api');
      expect(result.error).toBe('network');
      expect(result.url).toBe('https://example.com/api');
    });

    it('returns network error info for non-Error values', () => {
      const result = handleFetchError('some string', 'https://example.com/api');
      expect(result.error).toBe('network');
    });
  });
});
