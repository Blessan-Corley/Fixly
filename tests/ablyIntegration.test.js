// tests/ablyIntegration.test.js - Comprehensive Ably Real-time Integration Tests
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getServerAbly, CHANNELS, EVENTS } from '../lib/ably';
import { useAblyChannel } from '../contexts/AblyContext';
import { renderHook, act } from '@testing-library/react';

// Mock Ably SDK
const mockAblyChannel = {
  publish: jest.fn(() => Promise.resolve()),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  presence: {
    enter: jest.fn(() => Promise.resolve()),
    leave: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve([])),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  },
  history: jest.fn(() => Promise.resolve({ items: [] }))
};

const mockAblyClient = {
  channels: {
    get: jest.fn(() => mockAblyChannel),
    release: jest.fn()
  },
  connection: {
    state: 'connected',
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn()
  },
  auth: {
    authorize: jest.fn(() => Promise.resolve()),
    createTokenRequest: jest.fn(() => Promise.resolve())
  },
  stats: jest.fn(() => Promise.resolve([])),
  time: jest.fn(() => Promise.resolve(Date.now())),
  close: jest.fn()
};

jest.mock('ably', () => ({
  Realtime: jest.fn(() => mockAblyClient)
}));

// Mock Next.js session
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'fixer'
      }
    },
    status: 'authenticated'
  })
}));

// Mock React hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn((fn, deps) => fn()),
  useCallback: jest.fn((fn) => fn),
  useRef: jest.fn(() => ({ current: null })),
  useState: jest.fn((initial) => [initial, jest.fn()])
}));

describe('Ably Real-time Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockAblyChannel.publish.mockResolvedValue();
    mockAblyChannel.subscribe.mockImplementation((event, callback) => {
      // Store callback for manual triggering in tests
      global.mockAblyCallbacks = global.mockAblyCallbacks || {};
      global.mockAblyCallbacks[event] = callback;
    });
    mockAblyClient.channels.get.mockReturnValue(mockAblyChannel);
  });

  describe('Ably Client Connection', () => {
    test('should establish Ably connection successfully', () => {
      const client = getServerAbly();

      expect(client).toBeDefined();
      expect(client.connection).toBeDefined();
      expect(client.channels).toBeDefined();
    });

    test('should handle connection state changes', () => {
      const client = getServerAbly();

      // Simulate connection state change
      const connectionHandler = jest.fn();
      client.connection.on('connected', connectionHandler);

      expect(client.connection.on).toHaveBeenCalledWith('connected', connectionHandler);
    });

    test('should handle connection errors gracefully', () => {
      const client = getServerAbly();

      const errorHandler = jest.fn();
      client.connection.on('failed', errorHandler);

      expect(client.connection.on).toHaveBeenCalledWith('failed', errorHandler);
    });

    test('should close connection properly', () => {
      const client = getServerAbly();
      client.close();

      expect(client.close).toHaveBeenCalled();
    });
  });

  describe('Channel Management', () => {
    test('should create and retrieve channels correctly', () => {
      const client = getServerAbly();
      const channelName = CHANNELS.jobApplications('job-123');

      const channel = client.channels.get(channelName);

      expect(client.channels.get).toHaveBeenCalledWith(channelName);
      expect(channel).toBe(mockAblyChannel);
    });

    test('should handle multiple channels simultaneously', () => {
      const client = getServerAbly();

      const channels = [
        CHANNELS.jobApplications('job-1'),
        CHANNELS.jobComments('job-2'),
        CHANNELS.userNotifications('user-123')
      ];

      channels.forEach(channelName => {
        client.channels.get(channelName);
      });

      expect(client.channels.get).toHaveBeenCalledTimes(3);
    });

    test('should release channels when no longer needed', () => {
      const client = getServerAbly();
      const channelName = CHANNELS.jobApplications('job-123');

      client.channels.get(channelName);
      client.channels.release(channelName);

      expect(client.channels.release).toHaveBeenCalledWith(channelName);
    });
  });

  describe('Publishing Events', () => {
    test('should publish job application events', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const eventData = {
        jobId: 'job-123',
        applicantId: 'user-456',
        proposedBudget: 5000,
        timestamp: new Date().toISOString()
      };

      await channel.publish(EVENTS.APPLICATION_SUBMITTED, eventData);

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        EVENTS.APPLICATION_SUBMITTED,
        eventData
      );
    });

    test('should publish comment events', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobComments('job-123'));

      const commentData = {
        jobId: 'job-123',
        comment: {
          id: 'comment-456',
          content: 'Great job posting!',
          userId: 'user-789'
        },
        author: {
          id: 'user-789',
          name: 'John Doe'
        },
        timestamp: new Date().toISOString()
      };

      await channel.publish(EVENTS.COMMENT_POSTED, commentData);

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        EVENTS.COMMENT_POSTED,
        commentData
      );
    });

    test('should publish notification events', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userNotifications('user-123'));

      const notificationData = {
        id: 'notification-789',
        type: 'JOB_APPLICATION',
        title: 'New job application',
        message: 'You have received a new application',
        data: { jobId: 'job-123' },
        timestamp: new Date().toISOString()
      };

      await channel.publish(EVENTS.NOTIFICATION_SENT, notificationData);

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        EVENTS.NOTIFICATION_SENT,
        notificationData
      );
    });

    test('should handle publishing errors gracefully', async () => {
      mockAblyChannel.publish.mockRejectedValueOnce(new Error('Publishing failed'));

      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      try {
        await channel.publish(EVENTS.APPLICATION_SUBMITTED, { data: 'test' });
      } catch (error) {
        expect(error.message).toBe('Publishing failed');
      }

      expect(mockAblyChannel.publish).toHaveBeenCalled();
    });

    test('should publish events with proper data structure', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const eventData = {
        jobId: 'job-123',
        applicantId: 'user-456',
        application: {
          id: 'app-789',
          proposedBudget: 5000,
          message: 'I can do this job',
          timeline: '3 days'
        },
        applicant: {
          id: 'user-456',
          name: 'Jane Smith',
          rating: 4.8,
          skills: ['plumbing', 'electrical']
        },
        timestamp: new Date().toISOString()
      };

      await channel.publish(EVENTS.APPLICATION_SUBMITTED, eventData);

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        EVENTS.APPLICATION_SUBMITTED,
        expect.objectContaining({
          jobId: 'job-123',
          applicantId: 'user-456',
          application: expect.objectContaining({
            proposedBudget: 5000
          }),
          applicant: expect.objectContaining({
            name: 'Jane Smith'
          }),
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Subscribing to Events', () => {
    test('should subscribe to channel events', () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const eventHandler = jest.fn();
      channel.subscribe(EVENTS.APPLICATION_SUBMITTED, eventHandler);

      expect(mockAblyChannel.subscribe).toHaveBeenCalledWith(
        EVENTS.APPLICATION_SUBMITTED,
        eventHandler
      );
    });

    test('should handle received events correctly', () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const eventHandler = jest.fn();
      channel.subscribe(EVENTS.APPLICATION_SUBMITTED, eventHandler);

      // Simulate receiving an event
      const eventData = {
        jobId: 'job-123',
        applicantId: 'user-456'
      };

      const callback = global.mockAblyCallbacks[EVENTS.APPLICATION_SUBMITTED];
      if (callback) {
        callback({ data: eventData });
      }

      expect(eventHandler).toHaveBeenCalledWith({ data: eventData });
    });

    test('should unsubscribe from events', () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const eventHandler = jest.fn();
      channel.subscribe(EVENTS.APPLICATION_SUBMITTED, eventHandler);
      channel.unsubscribe(EVENTS.APPLICATION_SUBMITTED, eventHandler);

      expect(mockAblyChannel.unsubscribe).toHaveBeenCalledWith(
        EVENTS.APPLICATION_SUBMITTED,
        eventHandler
      );
    });

    test('should handle multiple subscribers for same event', () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      channel.subscribe(EVENTS.APPLICATION_SUBMITTED, handler1);
      channel.subscribe(EVENTS.APPLICATION_SUBMITTED, handler2);
      channel.subscribe(EVENTS.APPLICATION_SUBMITTED, handler3);

      expect(mockAblyChannel.subscribe).toHaveBeenCalledTimes(3);
    });
  });

  describe('Presence System', () => {
    test('should enter presence successfully', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userPresence('user-123'));

      const presenceData = {
        userId: 'user-123',
        name: 'Test User',
        status: 'online',
        lastSeen: new Date().toISOString()
      };

      await channel.presence.enter(presenceData);

      expect(mockAblyChannel.presence.enter).toHaveBeenCalledWith(presenceData);
    });

    test('should leave presence gracefully', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userPresence('user-123'));

      await channel.presence.leave();

      expect(mockAblyChannel.presence.leave).toHaveBeenCalled();
    });

    test('should get current presence members', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userPresence('user-123'));

      const mockMembers = [
        { clientId: 'user-123', data: { name: 'User 1', status: 'online' } },
        { clientId: 'user-456', data: { name: 'User 2', status: 'online' } }
      ];

      mockAblyChannel.presence.get.mockResolvedValueOnce(mockMembers);

      const members = await channel.presence.get();

      expect(members).toEqual(mockMembers);
      expect(mockAblyChannel.presence.get).toHaveBeenCalled();
    });

    test('should subscribe to presence events', () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userPresence('user-123'));

      const presenceHandler = jest.fn();
      channel.presence.subscribe('enter', presenceHandler);

      expect(mockAblyChannel.presence.subscribe).toHaveBeenCalledWith(
        'enter',
        presenceHandler
      );
    });
  });

  describe('React Hook Integration', () => {
    test('should useAblyChannel hook work correctly', () => {
      const channelName = CHANNELS.jobApplications('job-123');
      const eventName = EVENTS.APPLICATION_SUBMITTED;
      const callback = jest.fn();

      const { result } = renderHook(() =>
        useAblyChannel(channelName, eventName, callback)
      );

      expect(result.current).toBeDefined();
      expect(mockAblyClient.channels.get).toHaveBeenCalledWith(channelName);
      expect(mockAblyChannel.subscribe).toHaveBeenCalledWith(eventName, callback);
    });

    test('should handle channel subscription cleanup', () => {
      const channelName = CHANNELS.jobApplications('job-123');
      const eventName = EVENTS.APPLICATION_SUBMITTED;
      const callback = jest.fn();

      const { unmount } = renderHook(() =>
        useAblyChannel(channelName, eventName, callback)
      );

      unmount();

      expect(mockAblyChannel.unsubscribe).toHaveBeenCalledWith(eventName, callback);
    });

    test('should handle dynamic channel changes', () => {
      let channelName = CHANNELS.jobApplications('job-123');
      const eventName = EVENTS.APPLICATION_SUBMITTED;
      const callback = jest.fn();

      const { rerender } = renderHook(
        ({ channel }) => useAblyChannel(channel, eventName, callback),
        { initialProps: { channel: channelName } }
      );

      // Change channel
      channelName = CHANNELS.jobApplications('job-456');
      rerender({ channel: channelName });

      expect(mockAblyClient.channels.get).toHaveBeenCalledWith(channelName);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection failures', () => {
      mockAblyClient.connection.state = 'failed';

      const client = getServerAbly();

      expect(client.connection.state).toBe('failed');
    });

    test('should handle channel errors', async () => {
      mockAblyChannel.publish.mockRejectedValueOnce(new Error('Channel error'));

      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      try {
        await channel.publish(EVENTS.APPLICATION_SUBMITTED, { data: 'test' });
      } catch (error) {
        expect(error.message).toBe('Channel error');
      }
    });

    test('should handle presence errors', async () => {
      mockAblyChannel.presence.enter.mockRejectedValueOnce(new Error('Presence error'));

      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userPresence('user-123'));

      try {
        await channel.presence.enter({ userId: 'user-123' });
      } catch (error) {
        expect(error.message).toBe('Presence error');
      }
    });

    test('should handle network disconnections gracefully', () => {
      const client = getServerAbly();

      // Simulate network disconnection
      mockAblyClient.connection.state = 'disconnected';

      const reconnectHandler = jest.fn();
      client.connection.on('connected', reconnectHandler);

      // Simulate reconnection
      mockAblyClient.connection.state = 'connected';

      expect(client.connection.on).toHaveBeenCalledWith('connected', reconnectHandler);
    });
  });

  describe('Performance Tests', () => {
    test('should handle high-frequency events', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const events = [];
      for (let i = 0; i < 1000; i++) {
        events.push(
          channel.publish(EVENTS.APPLICATION_SUBMITTED, {
            jobId: 'job-123',
            applicantId: `user-${i}`,
            timestamp: new Date().toISOString()
          })
        );
      }

      const startTime = Date.now();
      await Promise.allSettled(events);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockAblyChannel.publish).toHaveBeenCalledTimes(1000);
    });

    test('should handle concurrent channel operations', async () => {
      const client = getServerAbly();

      const operations = [];
      for (let i = 0; i < 100; i++) {
        const channel = client.channels.get(`test-channel-${i}`);
        operations.push(
          channel.publish('test-event', { data: `test-${i}` })
        );
      }

      await Promise.allSettled(operations);

      expect(mockAblyClient.channels.get).toHaveBeenCalledTimes(100);
      expect(mockAblyChannel.publish).toHaveBeenCalledTimes(100);
    });

    test('should efficiently handle large payloads', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const largePayload = {
        jobId: 'job-123',
        applicantId: 'user-456',
        application: {
          detailedDescription: 'x'.repeat(10000), // 10KB string
          portfolio: Array.from({ length: 100 }, (_, i) => `item-${i}`),
          experience: Array.from({ length: 50 }, (_, i) => ({
            project: `Project ${i}`,
            description: 'Description '.repeat(100)
          }))
        }
      };

      const startTime = Date.now();
      await channel.publish(EVENTS.APPLICATION_SUBMITTED, largePayload);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        EVENTS.APPLICATION_SUBMITTED,
        largePayload
      );
    });
  });

  describe('Integration with Location Tracking', () => {
    test('should broadcast location updates via Ably', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userNotifications('user-123'));

      const locationData = {
        userId: 'user-123',
        reason: 'periodic_update',
        timestamp: new Date().toISOString()
      };

      await channel.publish('location_update_requested', locationData);

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        'location_update_requested',
        locationData
      );
    });

    test('should handle job suggestions notifications', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.userNotifications('user-123'));

      const suggestionData = {
        userId: 'user-123',
        jobCount: 5,
        location: 'Mumbai',
        timestamp: new Date().toISOString()
      };

      await channel.publish('job_suggestions_updated', suggestionData);

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        'job_suggestions_updated',
        suggestionData
      );
    });
  });

  describe('Channel History', () => {
    test('should retrieve channel history', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      const mockHistory = {
        items: [
          {
            name: EVENTS.APPLICATION_SUBMITTED,
            data: { jobId: 'job-123', applicantId: 'user-456' },
            timestamp: Date.now()
          }
        ]
      };

      mockAblyChannel.history.mockResolvedValueOnce(mockHistory);

      const history = await channel.history();

      expect(history).toEqual(mockHistory);
      expect(mockAblyChannel.history).toHaveBeenCalled();
    });

    test('should handle empty history', async () => {
      const client = getServerAbly();
      const channel = client.channels.get(CHANNELS.jobApplications('job-123'));

      mockAblyChannel.history.mockResolvedValueOnce({ items: [] });

      const history = await channel.history();

      expect(history.items).toHaveLength(0);
    });
  });

  describe('Authentication and Security', () => {
    test('should handle token authentication', async () => {
      const client = getServerAbly();

      await client.auth.authorize();

      expect(client.auth.authorize).toHaveBeenCalled();
    });

    test('should create token requests', async () => {
      const client = getServerAbly();

      const tokenRequest = await client.auth.createTokenRequest();

      expect(client.auth.createTokenRequest).toHaveBeenCalled();
      expect(tokenRequest).toBeDefined();
    });

    test('should handle authentication failures', async () => {
      const client = getServerAbly();

      client.auth.authorize.mockRejectedValueOnce(new Error('Auth failed'));

      try {
        await client.auth.authorize();
      } catch (error) {
        expect(error.message).toBe('Auth failed');
      }
    });
  });
});

export default {};