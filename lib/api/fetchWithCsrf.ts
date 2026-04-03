// Phase 2: Added a typed fetch wrapper that injects the in-memory CSRF token on mutations.
import { useAuthStore } from '@/lib/stores/authStore';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class FetchWithCsrfError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'FetchWithCsrfError';
    this.status = status;
    this.details = details;
  }
}

type JsonRecord = Record<string, unknown>;
type FetchImplementation = typeof fetch;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function shouldAttachCsrf(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

function isSameOriginRequest(input: RequestInfo | URL): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  const requestUrl =
    input instanceof Request
      ? new URL(input.url, window.location.origin)
      : new URL(String(input), window.location.origin);

  return requestUrl.origin === window.location.origin;
}

function buildHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  if (init?.headers) {
    const initHeaders = new Headers(init.headers);
    initHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}

export function createFetchWithCsrf(fetchImpl: FetchImplementation): FetchImplementation {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = buildHeaders(input, init);

    if (!headers.has('content-type') && init?.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (
      shouldAttachCsrf(method) &&
      isSameOriginRequest(input) &&
      !headers.has('x-csrf-token') &&
      !headers.has('csrf-token')
    ) {
      const csrfToken = useAuthStore.getState().csrfToken;
      if (csrfToken) {
        headers.set('x-csrf-token', csrfToken);
      }
    }

    return fetchImpl(input, {
      ...init,
      headers,
    });
  };
}

export const fetchWithCsrf = createFetchWithCsrf(fetch);

export async function fetchJsonWithCsrf<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchImpl: FetchImplementation = fetch
): Promise<T> {
  const response = await createFetchWithCsrf(fetchImpl)(input, init);
  const responseText = await response.text();
  const payload = responseText ? (JSON.parse(responseText) as unknown) : null;

  if (!response.ok) {
    const errorPayload = isJsonRecord(payload) ? payload : null;
    const message =
      (typeof errorPayload?.error === 'string' && errorPayload.error) ||
      (typeof errorPayload?.message === 'string' && errorPayload.message) ||
      `Request failed with status ${response.status}`;

    throw new FetchWithCsrfError(message, response.status, payload);
  }

  return payload as T;
}
