/**
 * Fetch with Timeout Utility
 * Prevents hanging requests by adding configurable timeouts
 * Works with AbortController
 */

export { TIMEOUT_CONFIGS, isTimeoutError, handleFetchError } from './fetchTimeout.types';
export type { TimeoutConfigKey, TimeoutError, BatchRequest } from './fetchTimeout.types';
export {
  fetchWithTimeout,
  createFetchWithTimeout,
  fetchWithRetry,
  smartFetch,
  fetchWithProgress,
  batchFetchWithTimeout,
} from './fetchTimeout.core';

import {
  fetchWithTimeout,
  createFetchWithTimeout,
  fetchWithRetry,
  smartFetch,
  fetchWithProgress,
  batchFetchWithTimeout,
} from './fetchTimeout.core';
import { TIMEOUT_CONFIGS, isTimeoutError, handleFetchError } from './fetchTimeout.types';

export default {
  fetchWithTimeout,
  createFetchWithTimeout,
  fetchWithRetry,
  smartFetch,
  fetchWithProgress,
  batchFetchWithTimeout,
  isTimeoutError,
  handleFetchError,
  TIMEOUT_CONFIGS,
};
