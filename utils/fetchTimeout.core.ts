import { TIMEOUT_CONFIGS, toTimeoutError, type TimeoutError } from './fetchTimeout.types';

function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = TIMEOUT_CONFIGS.default,
  existingSignal: AbortSignal | null = null
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => { timeoutController.abort(); }, timeout);
  try {
    const signal = existingSignal
      ? combineSignals([existingSignal, timeoutController.signal])
      : timeoutController.signal;
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError' && timeoutController.signal.aborted) {
      throw toTimeoutError(timeout);
    }
    throw error;
  }
}

export function createFetchWithTimeout(timeout: number = TIMEOUT_CONFIGS.default) {
  return (url: string, options: RequestInit = {}): Promise<Response> =>
    fetchWithTimeout(url, options, timeout);
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  timeout: number = TIMEOUT_CONFIGS.default
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeout);
    } catch (error) {
      lastError = error;
      const name = error instanceof Error ? error.name : '';
      if (name !== 'TimeoutError' && name !== 'TypeError') throw error;
      if (attempt === maxRetries) break;
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }
  throw lastError;
}

export async function smartFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let timeout: number = TIMEOUT_CONFIGS.default;
  if (url.includes('/upload') || url.includes('/media')) {
    timeout = TIMEOUT_CONFIGS.slow;
  } else if (url.includes('/stats') || url.includes('/dashboard')) {
    timeout = TIMEOUT_CONFIGS.medium;
  } else if (url.includes('/search') || url.includes('/browse')) {
    timeout = TIMEOUT_CONFIGS.medium;
  } else if (options.method === 'GET') {
    timeout = TIMEOUT_CONFIGS.fast;
  }
  return fetchWithTimeout(url, options, timeout);
}

export async function fetchWithProgress(
  url: string,
  options: RequestInit = {},
  onProgress: ((percent: number) => void) | null = null,
  timeout: number = TIMEOUT_CONFIGS.slow
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!onProgress || !response.body) return response;
    const contentLength = response.headers.get('content-length');
    if (!contentLength) return response;
    const total = parseInt(contentLength, 10);
    let loaded = 0;
    const reader = response.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const pump = (): void => {
          reader.read().then(({ done, value }) => {
            if (done) { streamController.close(); onProgress(100); return; }
            if (value) {
              loaded += value.byteLength;
              onProgress(Math.round((loaded / total) * 100));
              streamController.enqueue(value);
            }
            pump();
          }).catch((error) => { streamController.error(error); });
        };
        pump();
      },
    });
    return new Response(stream, { headers: response.headers, status: response.status, statusText: response.statusText });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') throw toTimeoutError(timeout);
    throw error;
  }
}

export async function batchFetchWithTimeout(
  requests: { url: string; options?: RequestInit }[],
  timeout: number = TIMEOUT_CONFIGS.default
): Promise<PromiseSettledResult<Response>[]> {
  return Promise.allSettled(
    requests.map(({ url, options = {} }) => fetchWithTimeout(url, options, timeout))
  );
}

// Re-export TimeoutError type for consumers
export type { TimeoutError };
