import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  abortableFetch,
  createAbortableFetch,
  useAbortControllers,
  withAbortController,
} from '@/utils/fetchWithAbort';

describe('fetchWithAbort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAbortableFetch', () => {
    it('returns a response on successful fetch', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const abortRef = { current: null };
      const fetchFn = createAbortableFetch(abortRef);
      const result = await fetchFn('https://example.com/api');

      expect(result).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledOnce();

      vi.unstubAllGlobals();
    });

    it('passes options to fetch', async () => {
      const mockResponse = new Response('Created', { status: 201 });
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      vi.stubGlobal('fetch', mockFetch);

      const abortRef = { current: null };
      const fetchFn = createAbortableFetch(abortRef);
      await fetchFn('https://example.com/api', { method: 'POST', body: '{}' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({ method: 'POST', body: '{}' })
      );

      vi.unstubAllGlobals();
    });

    it('aborts previous in-flight request when called again', async () => {
      const previousController = new AbortController();
      vi.spyOn(previousController, 'abort');

      const abortRef = { current: previousController };
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const fetchFn = createAbortableFetch(abortRef);
      await fetchFn('https://example.com/api');

      expect(previousController.abort).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('returns null when fetch throws AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const abortRef = { current: null };
      const fetchFn = createAbortableFetch(abortRef);
      const result = await fetchFn('https://example.com/api');

      expect(result).toBeNull();
      vi.unstubAllGlobals();
    });

    it('re-throws non-abort errors', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'TypeError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

      const abortRef = { current: null };
      const fetchFn = createAbortableFetch(abortRef);

      await expect(fetchFn('https://example.com/api')).rejects.toThrow('Network error');
      vi.unstubAllGlobals();
    });

    it('stores new AbortController in abortRef', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const abortRef = { current: null };
      const fetchFn = createAbortableFetch(abortRef);
      await fetchFn('https://example.com/api');

      expect(abortRef.current).toBeInstanceOf(AbortController);
      vi.unstubAllGlobals();
    });
  });

  describe('withAbortController', () => {
    it('calls the async function with provided args and signal', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const abortRef = { current: null };

      const wrapped = withAbortController(abortRef, mockFn);
      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', expect.any(AbortSignal));
    });

    it('returns null when the function throws an AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const mockFn = vi.fn().mockRejectedValue(abortError);
      const abortRef = { current: null };

      const wrapped = withAbortController(abortRef, mockFn);
      const result = await wrapped();

      expect(result).toBeNull();
    });

    it('re-throws non-abort errors', async () => {
      const err = new Error('Unexpected failure');
      err.name = 'TypeError';
      const mockFn = vi.fn().mockRejectedValue(err);
      const abortRef = { current: null };

      const wrapped = withAbortController(abortRef, mockFn);
      await expect(wrapped()).rejects.toThrow('Unexpected failure');
    });

    it('aborts previous controller before creating a new one', async () => {
      const previousController = new AbortController();
      const abortSpy = vi.spyOn(previousController, 'abort');
      const abortRef = { current: previousController };

      const mockFn = vi.fn().mockResolvedValue(42);
      const wrapped = withAbortController(abortRef, mockFn);
      await wrapped();

      expect(abortSpy).toHaveBeenCalled();
    });

    it('sets a new AbortController on abortRef', async () => {
      const abortRef = { current: null };
      const mockFn = vi.fn().mockResolvedValue('done');
      const wrapped = withAbortController(abortRef, mockFn);

      await wrapped();
      expect(abortRef.current).toBeInstanceOf(AbortController);
    });
  });

  describe('useAbortControllers', () => {
    it('returns the requested number of abort refs', () => {
      const [refs] = useAbortControllers(3);
      expect(refs).toHaveLength(3);
      refs.forEach((ref) => {
        expect(ref).toEqual({ current: null });
      });
    });

    it('returns an empty array for count 0', () => {
      const [refs] = useAbortControllers(0);
      expect(refs).toHaveLength(0);
    });

    it('cleanup function aborts all active controllers', () => {
      const [refs, cleanup] = useAbortControllers(2);
      const ctrl0 = new AbortController();
      const ctrl1 = new AbortController();
      refs[0].current = ctrl0;
      refs[1].current = ctrl1;

      const abort0 = vi.spyOn(ctrl0, 'abort');
      const abort1 = vi.spyOn(ctrl1, 'abort');

      cleanup();

      expect(abort0).toHaveBeenCalled();
      expect(abort1).toHaveBeenCalled();
    });

    it('cleanup skips null refs without throwing', () => {
      const [refs, cleanup] = useAbortControllers(2);
      // refs[0].current stays null
      refs[1].current = new AbortController();
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('abortableFetch', () => {
    it('returns a response on success', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await abortableFetch('https://example.com/api');
      expect(result).toBe(mockResponse);
      vi.unstubAllGlobals();
    });

    it('passes options to fetch', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      vi.stubGlobal('fetch', mockFetch);

      await abortableFetch('https://example.com/api', { method: 'DELETE' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({ method: 'DELETE' })
      );
      vi.unstubAllGlobals();
    });

    it('returns null when AbortError is thrown', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const result = await abortableFetch('https://example.com/api');
      expect(result).toBeNull();
      vi.unstubAllGlobals();
    });

    it('re-throws other errors', async () => {
      const err = new Error('DNS failure');
      err.name = 'TypeError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

      await expect(abortableFetch('https://example.com/api')).rejects.toThrow('DNS failure');
      vi.unstubAllGlobals();
    });
  });
});
