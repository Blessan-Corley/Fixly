import type { NextAuthOptions } from 'next-auth';

export const redirectCallback: NonNullable<NextAuthOptions['callbacks']>['redirect'] = async ({
  url,
  baseUrl,
}) => {
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return baseUrl;
  }

  const base = new URL(baseUrl);
  if (parsed.origin === base.origin) {
    return url;
  }

  return baseUrl;
};
