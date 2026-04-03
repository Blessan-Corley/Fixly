import { env } from '@/lib/env';
const DEFAULT_SITE_URL = 'https://fixly.app';
const DEFAULT_DEV_SITE_URL = 'http://localhost:3000';

function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  return url.toString().replace(/\/$/, '');
}

function getConfiguredUrl(): string | null {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.NEXTAUTH_URL,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    try {
      return normalizeUrl(trimmed);
    } catch {
      continue;
    }
  }

  return null;
}

export function getSiteUrl(): string {
  const configured = getConfiguredUrl();
  if (configured) return configured;
  return env.NODE_ENV === 'development' ? DEFAULT_DEV_SITE_URL : DEFAULT_SITE_URL;
}

export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}
