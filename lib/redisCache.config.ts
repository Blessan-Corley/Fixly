/** Internal types and configuration for the Redis caching layer. */

export type CacheConfig = {
  ttl: number;
  version: string;
  userSpecific?: boolean;
};

export type CacheConfigMap = Record<string, CacheConfig>;

export type CacheContext = Record<string, unknown>;

export type CacheHandler<TContext extends CacheContext = CacheContext> = (
  request: Request,
  context: TContext
) => Promise<Response> | Response;

export type CachePayload = {
  status: number;
  body: unknown;
  cachedAt: string;
};

export const CACHE_CONFIGS: CacheConfigMap = {
  '/api/skills': { ttl: 7 * 24 * 60 * 60, version: 'v1' },
  '/api/categories': { ttl: 7 * 24 * 60 * 60, version: 'v1' },
  '/api/location/cities': { ttl: 24 * 60 * 60, version: 'v1' },
  '/api/user/profile': { ttl: 15 * 60, version: 'v1', userSpecific: true },
  '/api/user/ratings': { ttl: 60 * 60, version: 'v1', userSpecific: true },
  '/api/user/reviews': { ttl: 30 * 60, version: 'v1', userSpecific: true },
  '/api/jobs/browse': { ttl: 5 * 60, version: 'v1' },
  '/api/jobs/search': { ttl: 10 * 60, version: 'v1' },
  '/api/jobs/[id]': { ttl: 15 * 60, version: 'v1' },
  '/api/jobs/applications': { ttl: 2 * 60, version: 'v1', userSpecific: true },
  '/api/stats/dashboard': { ttl: 60 * 60, version: 'v1', userSpecific: true },
  '/api/stats/public': { ttl: 6 * 60 * 60, version: 'v1' },
  default: { ttl: 5 * 60, version: 'v1' },
};

export function toCacheKeySegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '_');
}

export function toCachePatternSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9*]/g, '_');
}

export function buildCacheControlHeader(config: CacheConfig): string {
  return config.userSpecific
    ? `private, max-age=${config.ttl}`
    : `public, max-age=${config.ttl}`;
}

export function shouldBypassRequestCache(request: Request): boolean {
  const cacheControl = request.headers.get('cache-control')?.toLowerCase() ?? '';
  const pragma = request.headers.get('pragma')?.toLowerCase() ?? '';
  return (
    cacheControl.includes('no-cache') ||
    cacheControl.includes('no-store') ||
    pragma.includes('no-cache')
  );
}

export function shouldCacheResponse(response: Response): boolean {
  if (!(response.status >= 200 && response.status < 300)) return false;
  const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? '';
  if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) return false;
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.includes('application/json');
}

export function getCacheConfig(pathname: string): CacheConfig {
  if (CACHE_CONFIGS[pathname]) return CACHE_CONFIGS[pathname];

  for (const [pattern, config] of Object.entries(CACHE_CONFIGS)) {
    if (!pattern.includes('[')) continue;
    const escaped = pattern.replace(/[.*+?^${}()|\\]/g, '\\$&');
    const regexStr = escaped.replace(/\\\[.*?\\\]/g, '[^/]+');
    try {
      if (pathname.match(new RegExp(`^${regexStr}$`))) return config;
    } catch {
      // Ignore invalid pattern
    }
  }

  return CACHE_CONFIGS.default;
}
