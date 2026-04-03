export const TIMEOUT_CONFIGS = {
  fast: 5000,
  default: 10000,
  medium: 20000,
  slow: 30000,
  external: 15000,
} as const;

export type TimeoutConfigKey = keyof typeof TIMEOUT_CONFIGS;

export type TimeoutError = Error & {
  isTimeout?: boolean;
};

export type BatchRequest = {
  url: string;
  options?: RequestInit;
};

export function toTimeoutError(timeout: number): TimeoutError {
  const error = new Error(`Request timeout after ${timeout}ms`) as TimeoutError;
  error.name = 'TimeoutError';
  error.isTimeout = true;
  return error;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'TimeoutError' || (error as TimeoutError).isTimeout === true;
}

export function handleFetchError(
  error: unknown,
  url: string
): { error: 'timeout' | 'cancelled' | 'network'; message: string; url: string } {
  if (isTimeoutError(error)) {
    return { error: 'timeout', message: 'Request took too long. Please try again.', url };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return { error: 'cancelled', message: 'Request was cancelled', url };
  }
  return { error: 'network', message: 'Network error occurred. Please check your connection.', url };
}
