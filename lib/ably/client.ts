import Ably from 'ably';

declare global {
  // eslint-disable-next-line no-var
  var fixlySingletonAblyClient: Ably.Realtime | null | undefined;
}

let ablyInstance: Ably.Realtime | null = globalThis.fixlySingletonAblyClient ?? null;

/**
 * Returns the singleton Ably Realtime client.
 * Creates it on first call using token authentication.
 * Subsequent calls return the same instance.
 *
 * Never call `new Ably.Realtime()` anywhere else in the app.
 * Always use this function.
 */
export function getAblyClient(): Ably.Realtime {
  if (
    ablyInstance &&
    ablyInstance.connection.state !== 'closed' &&
    ablyInstance.connection.state !== 'failed'
  ) {
    return ablyInstance;
  }

  ablyInstance = new Ably.Realtime({
    authUrl: '/api/ably/auth',
    authMethod: 'POST',
    autoConnect: true,
    recover: (_lastConnectionDetails, callback) => {
      callback(true);
    },
  });
  globalThis.fixlySingletonAblyClient = ablyInstance;

  return ablyInstance;
}

/**
 * Closes and nulls the singleton client.
 * Call this on session end / sign out only.
 */
export function closeAblyClient(): void {
  if (!ablyInstance) {
    return;
  }

  ablyInstance.close();
  ablyInstance = null;
  globalThis.fixlySingletonAblyClient = null;
}
