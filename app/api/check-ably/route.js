import { NextResponse } from 'next/server';

export async function GET() {
  // Check for actual Ably keys used in the codebase
  const ablyKeys = {
    'ABLY_ROOT_KEY': process.env.ABLY_ROOT_KEY ? 'CONFIGURED' : 'MISSING',
    'NEXT_PUBLIC_ABLY_CLIENT_KEY': process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY ? 'CONFIGURED' : 'MISSING',
    // Also check legacy names
    'ABLY_API_KEY': process.env.ABLY_API_KEY ? 'CONFIGURED' : 'MISSING',
    'NEXT_PUBLIC_ABLY_KEY': process.env.NEXT_PUBLIC_ABLY_KEY ? 'CONFIGURED' : 'MISSING'
  };

  // Get actual key values (first 20 chars only for security)
  const actualKeys = {};
  Object.keys(ablyKeys).forEach(key => {
    const value = process.env[key];
    if (value) {
      actualKeys[key] = value.substring(0, 20) + '...';
    }
  });

  const hasServerKey = !!process.env.ABLY_ROOT_KEY || !!process.env.ABLY_API_KEY;
  const hasClientKey = !!process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY || !!process.env.NEXT_PUBLIC_ABLY_KEY;

  return NextResponse.json({
    configuredKeys: ablyKeys,
    keyPreviews: actualKeys,
    hasServerKey,
    hasClientKey,
    fullyConfigured: hasServerKey && hasClientKey,
    message: (hasServerKey && hasClientKey) ? '✅ Ably fully configured' : '⚠️ Ably partially configured'
  });
}
