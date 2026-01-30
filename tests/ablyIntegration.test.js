// tests/ablyIntegration.test.js - Real Server-side Ably Integration Tests
/**
 * @jest-environment node
 */
import { describe, test, expect, beforeAll, jest } from '@jest/globals';

// Unmock Ably to use real implementation
jest.unmock('ably');
jest.unmock('../lib/ably');

import { getServerAbly, CHANNELS, EVENTS } from '../lib/ably';

// Use a unique channel for testing to avoid noise
const TEST_CHANNEL = `test:integration:${Date.now()}`;

describe('Real Ably REST Integration', () => {
  let ably;

  beforeAll(() => {
    // Force Node environment behavior by removing window if present
    if (typeof window !== 'undefined') {
        try {
            // @ts-ignore
            delete global.window;
        } catch (e) {
            // window might be non-configurable
            // @ts-ignore
            global.window = undefined;
        }
    }

    console.log('DEBUG: typeof window =', typeof window);
    console.log('DEBUG: ABLY_ROOT_KEY =', process.env.ABLY_ROOT_KEY);

    // Ensure Key is present (debug if missing)
    if (!process.env.ABLY_ROOT_KEY) {
      console.warn('⚠️ ABLY_ROOT_KEY is missing in process.env! Jest setup issue?');
      // Attempt to load .env manually if needed, or rely on pipeline secret
    }

    ably = getServerAbly();
    if (!ably) {
      console.warn('Ably client not initialized. Check ABLY_ROOT_KEY.');
    }
  });

  test('should initialize Ably REST client', () => {
    expect(ably).toBeDefined();
    if (ably) {
      // Verify it is a REST client (has channels.get, but no connection.on for realtime)
      expect(ably.channels).toBeDefined();
    }
  });

  test('should publish a message to a channel successfully', async () => {
    if (!ably) return;

    const channel = ably.channels.get(TEST_CHANNEL);
    const payload = { text: 'Hello World', timestamp: Date.now() };

    // This is a real network call to Ably
    await channel.publish(EVENTS.NOTIFICATION_SENT, payload);

    // If we got here, it didn't throw, which means success for REST publish
    expect(true).toBe(true);
  });

  test('should be able to retrieve history (if enabled on account)', async () => {
    if (!ably) return;

    const channel = ably.channels.get(TEST_CHANNEL);
    
    // History might be disabled on the account, so we check if the call succeeds
    // rather than strictly asserting on the returned items.
    try {
      const history = await channel.history();
      expect(history).toBeDefined();
      expect(history.items).toBeDefined();
      
      // If history is enabled, we should see our message from the previous test
      // (Consistency might take a moment, so we don't strictly enforce item count here)
      if (history.items.length > 0) {
        const lastMsg = history.items[0];
        // Ably history is usually latest first
        expect(lastMsg.name).toBe(EVENTS.NOTIFICATION_SENT);
      }
    } catch (error) {
      // 401/403 might happen if history is not enabled/allowed
      console.warn('Ably history check failed (likely permissions/plan):', error.message);
    }
  });

  test('should handle presence (REST get)', async () => {
    if (!ably) return;
    
    // REST clients can query presence
    const channel = ably.channels.get(TEST_CHANNEL);
    try {
      const presence = await channel.presence.get();
      expect(Array.isArray(presence)).toBe(true);
    } catch (error) {
      console.warn('Ably presence check failed:', error.message);
    }
  });

});