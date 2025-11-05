/**
 * Fetch with Timeout Utility
 * Prevents hanging requests by adding configurable timeouts
 * Works seamlessly with AbortController
 */

/**
 * Default timeout configurations by endpoint type
 */
export const TIMEOUT_CONFIGS = {
  // Quick operations
  'fast': 5000,           // 5 seconds for quick reads
  'default': 10000,       // 10 seconds default
  'medium': 20000,        // 20 seconds for complex queries
  'slow': 30000,          // 30 seconds for uploads/heavy operations
  'external': 15000       // 15 seconds for external API calls
};

/**
 * Fetch with automatic timeout
 * Combines AbortController with timeout for robust request handling
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @param {AbortSignal} existingSignal - Optional existing AbortController signal
 * @returns {Promise<Response>}
 *
 * @example
 * // Basic usage
 * const response = await fetchWithTimeout('/api/data', {}, 10000);
 *
 * @example
 * // With existing AbortController
 * const controller = new AbortController();
 * const response = await fetchWithTimeout('/api/data', {}, 10000, controller.signal);
 */
export async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_CONFIGS.default, existingSignal = null) {
  // Create a new AbortController for timeout
  const timeoutController = new AbortController();

  // Set up timeout
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeout);

  try {
    // Combine existing signal with timeout signal if provided
    const signal = existingSignal
      ? combineSignals([existingSignal, timeoutController.signal])
      : timeoutController.signal;

    const response = await fetch(url, {
      ...options,
      signal
    });

    clearTimeout(timeoutId);
    return response;

  } catch (error) {
    clearTimeout(timeoutId);

    // Check if it was a timeout
    if (error.name === 'AbortError' && timeoutController.signal.aborted) {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`);
      timeoutError.name = 'TimeoutError';
      timeoutError.isTimeout = true;
      throw timeoutError;
    }

    throw error;
  }
}

/**
 * Combine multiple AbortSignals into one
 * Aborts when any of the source signals abort
 */
function combineSignals(signals) {
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

/**
 * Create a reusable fetch function with timeout
 * Returns a function that applies timeout to all calls
 *
 * @param {number} timeout - Default timeout for all calls
 * @returns {Function}
 *
 * @example
 * const apiFetch = createFetchWithTimeout(10000);
 * const response = await apiFetch('/api/data', { method: 'POST' });
 */
export function createFetchWithTimeout(timeout = TIMEOUT_CONFIGS.default) {
  return (url, options = {}) => fetchWithTimeout(url, options, timeout);
}

/**
 * Fetch with automatic retry on timeout
 * Retries the request if it times out
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @param {number} timeout - Timeout per attempt in milliseconds
 * @returns {Promise<Response>}
 *
 * @example
 * const response = await fetchWithRetry('/api/data', {}, 2, 10000);
 */
export async function fetchWithRetry(
  url,
  options = {},
  maxRetries = 2,
  timeout = TIMEOUT_CONFIGS.default
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Fetch attempt ${attempt + 1}/${maxRetries + 1} for ${url}`);

      const response = await fetchWithTimeout(url, options, timeout);

      console.log(`✅ Fetch successful on attempt ${attempt + 1}`);
      return response;

    } catch (error) {
      lastError = error;

      // Don't retry if it's not a timeout or network error
      if (error.name !== 'TimeoutError' && error.name !== 'TypeError') {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries + 1} attempts failed for ${url}`);
        break;
      }

      // Wait before retrying (exponential backoff)
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.log(`⏳ Retrying after ${backoffTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }

  throw lastError;
}

/**
 * Smart fetch with adaptive timeout based on endpoint
 * Automatically selects timeout based on URL patterns
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 *
 * @example
 * const response = await smartFetch('/api/jobs/upload-media', { method: 'POST' });
 */
export async function smartFetch(url, options = {}) {
  let timeout = TIMEOUT_CONFIGS.default;

  // Determine timeout based on URL patterns
  if (url.includes('/upload') || url.includes('/media')) {
    timeout = TIMEOUT_CONFIGS.slow; // 30s for uploads
  } else if (url.includes('/stats') || url.includes('/dashboard')) {
    timeout = TIMEOUT_CONFIGS.medium; // 20s for complex queries
  } else if (url.includes('/search') || url.includes('/browse')) {
    timeout = TIMEOUT_CONFIGS.medium; // 20s for searches
  } else if (options.method === 'GET') {
    timeout = TIMEOUT_CONFIGS.fast; // 5s for simple GETs
  }

  return fetchWithTimeout(url, options, timeout);
}

/**
 * Fetch with progress tracking (for large uploads/downloads)
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {Function} onProgress - Callback for progress updates (percent)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
export async function fetchWithProgress(url, options = {}, onProgress = null, timeout = TIMEOUT_CONFIGS.slow) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!onProgress || !response.body) {
      return response;
    }

    // Track progress for downloads
    const contentLength = response.headers.get('content-length');
    if (!contentLength) {
      return response;
    }

    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body.getReader();
    const stream = new ReadableStream({
      start(controller) {
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              onProgress(100);
              return;
            }

            loaded += value.byteLength;
            const percent = Math.round((loaded / total) * 100);
            onProgress(percent);

            controller.enqueue(value);
            push();
          });
        }
        push();
      }
    });

    return new Response(stream, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText
    });

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }

    throw error;
  }
}

/**
 * Batch fetch with timeout
 * Fetches multiple URLs with individual timeouts
 *
 * @param {Array<{url: string, options: Object}>} requests - Array of request configs
 * @param {number} timeout - Timeout per request
 * @returns {Promise<Array<Response|Error>>}
 *
 * @example
 * const results = await batchFetchWithTimeout([
 *   { url: '/api/user', options: {} },
 *   { url: '/api/jobs', options: {} }
 * ], 10000);
 */
export async function batchFetchWithTimeout(requests, timeout = TIMEOUT_CONFIGS.default) {
  return Promise.allSettled(
    requests.map(({ url, options }) =>
      fetchWithTimeout(url, options, timeout)
    )
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error) {
  return error && (error.name === 'TimeoutError' || error.isTimeout === true);
}

/**
 * Enhanced error handler for timeout errors
 */
export function handleFetchError(error, url) {
  if (isTimeoutError(error)) {
    console.error(`⏱️ Request timeout for ${url}:`, error.message);
    return {
      error: 'timeout',
      message: 'Request took too long. Please try again.',
      url
    };
  }

  if (error.name === 'AbortError') {
    console.log(`🚫 Request cancelled for ${url}`);
    return {
      error: 'cancelled',
      message: 'Request was cancelled',
      url
    };
  }

  console.error(`❌ Fetch error for ${url}:`, error);
  return {
    error: 'network',
    message: 'Network error occurred. Please check your connection.',
    url
  };
}

export default {
  fetchWithTimeout,
  createFetchWithTimeout,
  fetchWithRetry,
  smartFetch,
  fetchWithProgress,
  batchFetchWithTimeout,
  isTimeoutError,
  handleFetchError,
  TIMEOUT_CONFIGS
};
