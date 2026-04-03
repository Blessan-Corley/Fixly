import type { RedisScanResult } from './types';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseRedisScanResult(scanResult: unknown): { nextCursor: string; keys: string[] } {
  if (Array.isArray(scanResult) && scanResult.length >= 2) {
    const [cursorCandidate, keysCandidate] = scanResult;
    return {
      nextCursor: String(cursorCandidate ?? '0'),
      keys: isStringArray(keysCandidate) ? keysCandidate : [],
    };
  }

  if (scanResult && typeof scanResult === 'object') {
    const resultObject = scanResult as RedisScanResult;

    if (Array.isArray(resultObject.result) && resultObject.result.length >= 2) {
      const [cursorCandidate, keysCandidate] = resultObject.result;
      return {
        nextCursor: String(cursorCandidate ?? resultObject.cursor ?? '0'),
        keys: isStringArray(keysCandidate) ? keysCandidate : [],
      };
    }

    return {
      nextCursor: String(resultObject.nextCursor ?? resultObject.cursor ?? '0'),
      keys: isStringArray(resultObject.keys) ? resultObject.keys : [],
    };
  }

  return { nextCursor: '0', keys: [] };
}
