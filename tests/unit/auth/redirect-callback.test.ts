import { describe, expect, it } from 'vitest';

import { redirectCallback as _redirectCallback } from '@/lib/auth/callbacks/redirect';

// redirectCallback is typed as optional by NextAuth — assert it's defined
const redirectCallback = _redirectCallback!;

const BASE_URL = 'https://fixly.app';

async function redirect(url: string, baseUrl = BASE_URL): Promise<string> {
  return redirectCallback({ url, baseUrl });
}

// ── Relative URLs ──────────────────────────────────────────────────────────────

describe('redirectCallback — relative URLs', () => {
  it('prepends baseUrl to a simple relative path', async () => {
    expect(await redirect('/dashboard')).toBe(`${BASE_URL}/dashboard`);
  });

  it('prepends baseUrl to the root path', async () => {
    expect(await redirect('/')).toBe(`${BASE_URL}/`);
  });

  it('prepends baseUrl to a deep relative path', async () => {
    expect(await redirect('/auth/signin?next=/dashboard')).toBe(
      `${BASE_URL}/auth/signin?next=/dashboard`
    );
  });

  it('prepends baseUrl to paths with hash fragments', async () => {
    expect(await redirect('/page#section')).toBe(`${BASE_URL}/page#section`);
  });
});

// ── Same-origin absolute URLs ──────────────────────────────────────────────────

describe('redirectCallback — same-origin absolute URLs', () => {
  it('allows same-origin absolute URLs unchanged', async () => {
    const url = `${BASE_URL}/dashboard`;
    expect(await redirect(url)).toBe(url);
  });

  it('allows same-origin URLs with query params', async () => {
    const url = `${BASE_URL}/auth/callback?code=abc`;
    expect(await redirect(url)).toBe(url);
  });

  it('allows same-origin URLs with port matching baseUrl', async () => {
    const base = 'http://localhost:3000';
    const url = 'http://localhost:3000/dashboard';
    expect(await redirect(url, base)).toBe(url);
  });
});

// ── Cross-origin absolute URLs ─────────────────────────────────────────────────

describe('redirectCallback — cross-origin absolute URLs', () => {
  it('blocks cross-origin URL and returns baseUrl', async () => {
    expect(await redirect('https://evil.com/steal')).toBe(BASE_URL);
  });

  it('blocks cross-origin URL with same path', async () => {
    expect(await redirect('https://not-fixly.app/dashboard')).toBe(BASE_URL);
  });

  it('blocks http vs https origin mismatch', async () => {
    expect(await redirect('http://fixly.app/dashboard')).toBe(BASE_URL);
  });

  it('blocks cross-origin with subdomain of baseUrl', async () => {
    expect(await redirect('https://evil.fixly.app/steal')).toBe(BASE_URL);
  });

  it('blocks URL with extra auth credentials (user@host)', async () => {
    // URLs like https://fixly.app@evil.com should be treated as cross-origin
    const url = 'https://fixly.app@evil.com/path';
    const result = await redirect(url);
    // Should not redirect to evil.com
    expect(result).not.toContain('evil.com');
  });
});

// ── Invalid / unparseable URLs ─────────────────────────────────────────────────

describe('redirectCallback — invalid URLs', () => {
  it('returns baseUrl for a completely invalid URL string', async () => {
    expect(await redirect('not a url at all')).toBe(BASE_URL);
  });

  it('returns baseUrl for an empty string', async () => {
    expect(await redirect('')).toBe(BASE_URL);
  });

  it('returns baseUrl for a bare domain without scheme', async () => {
    expect(await redirect('evil.com/path')).toBe(BASE_URL);
  });

  it('returns baseUrl for javascript: scheme', async () => {
    // javascript: URLs are not relative (no leading /) and not valid http URLs
    const result = await redirect('javascript:alert(1)');
    expect(result).toBe(BASE_URL);
  });
});

// ── Different baseUrl values ───────────────────────────────────────────────────

describe('redirectCallback — varied baseUrl', () => {
  it('works with http localhost baseUrl', async () => {
    const base = 'http://localhost:3000';
    expect(await redirect('/login', base)).toBe('http://localhost:3000/login');
  });

  it('same-origin check respects port differences', async () => {
    const base = 'http://localhost:3000';
    // Port 4000 is a different origin
    expect(await redirect('http://localhost:4000/login', base)).toBe(base);
  });
});
