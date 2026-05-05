import { fetchWithTimeout } from './fetchTimeout.core';
import { TIMEOUT_CONFIGS, toTimeoutError } from './fetchTimeout.types';

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
    return new Response(stream, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
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
