/**
 * Utility function to wrap fetch calls with AbortController
 * Prevents race conditions and memory leaks in React components
 */

/**
 * Creates an abortable fetch wrapper
 * @param {React.MutableRefObject} abortRef - useRef object to store AbortController
 * @returns {Function} - Wrapped fetch function
 */
export function createAbortableFetch(abortRef) {
  return async (url, options = {}) => {
    // Cancel previous request if exists
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Create new AbortController
    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      // Add signal to fetch options
      const response = await fetch(url, {
        ...options,
        signal: abortController.signal
      });

      // Check if aborted
      if (abortController.signal.aborted) {
        return null;
      }

      return response;
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  };
}

/**
 * Higher-order function to add AbortController to async functions
 * @param {React.MutableRefObject} abortRef - useRef object to store AbortController
 * @param {Function} asyncFn - Async function that uses fetch
 * @returns {Function} - Wrapped function with abort capability
 */
export function withAbortController(abortRef, asyncFn) {
  return async (...args) => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      // Pass abort signal to the function
      const result = await asyncFn(...args, abortController.signal);

      if (abortController.signal.aborted) {
        return null;
      }

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  };
}

/**
 * Hook-like pattern for managing multiple abort controllers
 * @param {number} count - Number of abort refs needed
 * @returns {Array} - Array of abort refs and cleanup function
 */
export function useAbortControllers(count) {
  const refs = [];
  for (let i = 0; i < count; i++) {
    refs.push({ current: null });
  }

  const cleanup = () => {
    refs.forEach(ref => {
      if (ref.current) {
        ref.current.abort();
      }
    });
  };

  return [refs, cleanup];
}

/**
 * Simple abortable fetch - single use
 * @param {string} url - Fetch URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response|null>} - Response or null if aborted
 */
export async function abortableFetch(url, options = {}) {
  const abortController = new AbortController();

  try {
    const response = await fetch(url, {
      ...options,
      signal: abortController.signal
    });

    if (abortController.signal.aborted) {
      return null;
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

export default {
  createAbortableFetch,
  useAbortControllers,
  abortableFetch
};
