const CACHE_PREFIX = 'fixly:location-cache:';
const SEARCH_TTL_MS = 10 * 60 * 1000;
const PLACE_TTL_MS = 60 * 60 * 1000;
const MAX_BYTES = 75_000;

type CacheEntry = { value: unknown; expiresAt: number };

const canUseStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const cacheKey = (type: 'search_results' | 'place_details', key: string): string =>
  `${CACHE_PREFIX}${type}:${key}`;

const write = (
  type: 'search_results' | 'place_details',
  key: string,
  value: unknown,
  ttlMs: number
): void => {
  if (!canUseStorage()) return;
  try {
    const payload = JSON.stringify({ value, expiresAt: Date.now() + ttlMs } satisfies CacheEntry);
    if (payload.length > MAX_BYTES) return;
    window.localStorage.setItem(cacheKey(type, key), payload);
  } catch {
    // storage quota exceeded — silently skip
  }
};

const read = (type: 'search_results' | 'place_details', key: string): unknown | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(type, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEntry>;
    if (!parsed || typeof parsed.expiresAt !== 'number') {
      window.localStorage.removeItem(cacheKey(type, key));
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(cacheKey(type, key));
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
};

export const locationCache = {
  cacheSearchResults: async (query: string, results: unknown): Promise<void> => {
    write('search_results', encodeURIComponent(query.toLowerCase()), results, SEARCH_TTL_MS);
  },
  getCachedSearchResults: async (query: string): Promise<unknown | null> => {
    return read('search_results', encodeURIComponent(query.toLowerCase()));
  },
  cachePlaceDetails: async (placeId: string, details: unknown): Promise<void> => {
    write('place_details', placeId, details, PLACE_TTL_MS);
  },
  getCachedPlaceDetails: async (placeId: string): Promise<unknown | null> => {
    return read('place_details', placeId);
  },
};
