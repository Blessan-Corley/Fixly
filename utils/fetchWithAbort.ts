/**
 * Utility functions to wrap fetch calls with AbortController.
 * Prevents race conditions and memory leaks in React components.
 * Standalone (non-ref) utilities: see fetchWithAbort.standalone.ts
 */

type AbortRef = { current: AbortController | null };

const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : '';

export { abortableFetch, withAbortController } from './fetchWithAbort.standalone';

export function createAbortableFetch(abortRef: AbortRef) {
  return async (url: string, options: RequestInit = {}): Promise<Response | null> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return null;
      }

      return response;
    } catch (error) {
      if (getErrorName(error) === 'AbortError') {
        return null;
      }
      throw error;
    }
  };
}

export function useAbortControllers(count: number): [AbortRef[], () => void] {
  const refs: AbortRef[] = [];
  for (let index = 0; index < count; index++) {
    refs.push({ current: null });
  }

  const cleanup = () => {
    refs.forEach((ref) => {
      if (ref.current) {
        ref.current.abort();
      }
    });
  };

  return [refs, cleanup];
}

export default {
  createAbortableFetch,
  useAbortControllers,
};
