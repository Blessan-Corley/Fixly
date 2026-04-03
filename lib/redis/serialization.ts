import { REDIS_JSON_PREFIX } from './constants';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function serializeRedisValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    isPlainObject(value)
  ) {
    return `${REDIS_JSON_PREFIX}${JSON.stringify(value)}`;
  }

  return `${REDIS_JSON_PREFIX}${JSON.stringify(value)}`;
}

export function deserializeRedisValue<T>(value: string | null): T | string | null {
  if (value === null) {
    return null;
  }

  if (!value.startsWith(REDIS_JSON_PREFIX)) {
    return value;
  }

  try {
    return JSON.parse(value.slice(REDIS_JSON_PREFIX.length)) as T;
  } catch {
    return value;
  }
}
