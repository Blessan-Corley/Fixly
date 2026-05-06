/**
 * Standalone abort utilities that don't require a persistent ref.
 */

const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : '';

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

export function withAbortController<TArgs extends unknown[], TResult>(
  abortRef: { current: AbortController | null },
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
