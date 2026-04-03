import Ably from 'ably';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { closeAblyClient, getAblyClient } from './client';
import type { AblyRealtime, AblyRest } from './legacy.types';

declare global {
  // eslint-disable-next-line no-var
  var fixlyAblyUnloadHandlersRegistered: boolean | undefined;
  // eslint-disable-next-line no-var
  var fixlyServerAblyClient: AblyRest | null | undefined;
}

let serverAbly: AblyRest | null = globalThis.fixlyServerAblyClient ?? null;

export function getServerAbly(): AblyRest | null {
  if (!serverAbly && typeof window === 'undefined') {
    const ablyKey = env.ABLY_API_KEY ?? env.ABLY_ROOT_KEY;
    if (!ablyKey) {
      logger.error('ABLY_API_KEY not configured - server-side real-time features disabled');
      return null;
    }

    try {
      serverAbly = new Ably.Rest({
        key: ablyKey,
        httpRequestTimeout: 10000,
      });
      globalThis.fixlyServerAblyClient = serverAbly;
      logger.info('Ably REST client initialized for server-side operations');
    } catch (error: unknown) {
      logger.error('Failed to initialize Ably REST client:', error);
      return null;
    }
  }

  return serverAbly;
}

export function getClientAbly(): AblyRealtime | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return getAblyClient() as AblyRealtime;
  } catch (error: unknown) {
    logger.error('Failed to initialize Ably client:', error);
    return null;
  }
}

export function cleanupClientAbly(): void {
  try {
    closeAblyClient();
    logger.info('Client Ably instance cleaned up');
  } catch (error: unknown) {
    logger.error('Error cleaning up client Ably:', error);
  }
}

if (typeof window !== 'undefined' && !globalThis.fixlyAblyUnloadHandlersRegistered) {
  window.addEventListener('beforeunload', cleanupClientAbly);
  window.addEventListener('unload', cleanupClientAbly);
  globalThis.fixlyAblyUnloadHandlersRegistered = true;
}
