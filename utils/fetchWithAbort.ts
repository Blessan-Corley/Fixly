/**
 * Utility function to wrap fetch calls with AbortController
 * Prevents race conditions and memory leaks in React components
 */

type AbortRef = { current: AbortController | null };

const getErrorName = (error: unknown) => {
  if (error instanceof Error) {
    return error.name;
  }
  return '';
};

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

export function withAbortController<TArgs extends unknown[], TResult>(
  abortRef: AbortRef,
  asyncFn: (...args: [...TArgs, AbortSignal]) => Promise<TResult>
) {
  return async (...args: TArgs): Promise<TResult | null> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const result = await asyncFn(...args, abortController.signal);
      if (abortController.signal.aborted) {
        return null;
      }
      return result;
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

export async function abortableFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response | null> {
  const abortController = new AbortController();

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
}

export default {
  createAbortableFetch,
  useAbortControllers,
  abortableFetch,
};
