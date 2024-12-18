/**
 * Ably Real-time Configuration and Utilities
 * Handles client/server Ably instances and channel management
 */

import Ably from 'ably';

// Server-side Ably REST client (serverless-compatible)
// Use REST API instead of Realtime for server-side operations in serverless environments
let serverAbly = null;

export function getServerAbly() {
  if (!serverAbly && typeof window === 'undefined') {
    const ablyKey = process.env.ABLY_ROOT_KEY;

    if (!ablyKey) {
      console.error('❌ ABLY_ROOT_KEY not configured - server-side real-time features disabled');
      return null;
    }

    try {
      // Use Ably REST client for serverless compatibility (Vercel)
      // REST is stateless and doesn't maintain persistent connections
      serverAbly = new Ably.Rest({
        key: ablyKey,
        // Timeout for REST requests
        httpRequestTimeout: 10000,
        // Use promises for easier async/await usage
        promises: true
      });

      console.log('✅ Ably REST client initialized for server-side operations');
    } catch (error) {
      console.error('❌ Failed to initialize Ably REST client:', error);
      return null;
    }
  }
  return serverAbly;
}

// Client-side Ably instance (with subscribe-only key)
let clientAbly = null;

export function getClientAbly() {
  if (!clientAbly && typeof window !== 'undefined') {
    // Initializing Ably with Token Auth strategy

    try {
      clientAbly = new Ably.Realtime({
        authUrl: '/api/ably/auth',
        authMethod: 'GET',
        echoMessages: false,
        autoConnect: true,
        // Enhanced connection options
        disconnectedRetryTimeout: 1000,
        suspendedRetryTimeout: 1000,
        httpRequestTimeout: 10000,
        channelRetryTimeout: 1000,
        // Connection recovery
        recover: true,
        closeOnUnload: false,
        // Transport fallbacks - use all available transports for reliability
        transports: ['web_socket', 'xhr_polling'],
        // Additional options for reliability
        fallbackHosts: ['realtime-fallback.ably.io'],
        queueMessages: true
      });

      // Enhanced connection monitoring
      clientAbly.connection.on('connected', () => {
        console.log('🟢 Ably connected successfully');
      });

      clientAbly.connection.on('connecting', () => {
        console.log('🔄 Ably connecting...');
      });

      clientAbly.connection.on('disconnected', () => {
        console.log('🔴 Ably disconnected - will attempt to reconnect');
      });

      clientAbly.connection.on('suspended', () => {
        console.log('🟡 Ably connection suspended - will attempt to reconnect');
      });

      clientAbly.connection.on('failed', (error) => {
        console.error('❌ Ably connection failed:', error);
      });

      clientAbly.connection.on('update', (stateChange) => {
        console.log(`🔄 Ably connection state: ${stateChange.previous} → ${stateChange.current}`);
      });

    } catch (error) {
      console.error('❌ Failed to initialize Ably client:', error);
      return null;
    }
  }
  return clientAbly;
}

// Cleanup function for client Ably instance
export function cleanupClientAbly() {
  if (clientAbly) {
    try {
      // Remove all connection event listeners
      clientAbly.connection.off();

      // Close all channels
      const channels = clientAbly.channels;
      if (channels && typeof channels.release === 'function') {
        channels.release();
      }

      // Close the connection
      clientAbly.close();
      clientAbly = null;

      console.log('🧹 Client Ably instance cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up client Ably:', error);
    }
  }
}

// Global cleanup for page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupClientAbly);
  window.addEventListener('unload', cleanupClientAbly);
}

// Channel naming utilities
export const CHANNELS = {
  // Job-specific channels
  jobUpdates: (jobId) => `job:${jobId}:updates`,
  jobComments: (jobId) => `job:${jobId}:comments`,
  jobApplications: (jobId) => `job:${jobId}:applications`,
  jobQuestions: (jobId) => `job:${jobId}:questions`,

  // User-specific channels
  userNotifications: (userId) => `user:${userId}:notifications`,
  userPresence: (userId) => `user:${userId}:presence`,
  userTyping: (userId) => `user:${userId}:typing`,

  // Private messaging (only after job assignment)
  privateMessage: (jobId, hirerId, fixerId) => {
    const sortedIds = [hirerId, fixerId].sort();
    return `job:${jobId}:private:${sortedIds[0]}:${sortedIds[1]}`;
  },

  // Conversation channels
  conversation: (conversationId) => `conversation:${conversationId}`,
  userNotifications: (userId) => `user:${userId}:notifications`,

  // Global channels
  newJobs: 'jobs:new',
  systemAnnouncements: 'system:announcements',

  // Search and analytics channels
  searchTrends: 'search:trends',
  searchActivity: 'search:activity',
  searchFilters: 'search:filters',
  jobStats: 'jobs:stats',

  // Skill-based job notifications
  skillJobs: (skillName) => `skill:${skillName.toLowerCase()}:jobs`,

  // Location-based job notifications
  locationJobs: (city, state) => `location:${city.toLowerCase()}:${state.toLowerCase()}:jobs`
};

// Event types for consistent messaging
export const EVENTS = {
  // Job events
  JOB_POSTED: 'job_posted',
  JOB_UPDATED: 'job_updated',
  JOB_STATUS_CHANGED: 'job_status_changed',
  JOB_DELETED: 'job_deleted',

  // Application events
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_ACCEPTED: 'application_accepted',
  APPLICATION_REJECTED: 'application_rejected',
  JOB_ASSIGNED: 'job_assigned',

  // Comment events
  COMMENT_POSTED: 'comment_posted',
  COMMENT_LIKED: 'comment_liked',
  COMMENT_REACTED: 'comment_reacted',
  COMMENT_EDITED: 'comment_edited',
  COMMENT_REPLIED: 'comment_replied',
  COMMENT_DELETED: 'comment_deleted',

  // Message events
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  MESSAGES_READ: 'messages_read',
  MESSAGE_NOTIFICATION: 'message_notification',

  // Conversation events
  CONVERSATION_CREATED: 'conversation_created',
  CONVERSATION_UPDATED: 'conversation_updated',

  // Presence events
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',

  // Notification events
  NOTIFICATION_SENT: 'notification_sent',
  NOTIFICATION_READ: 'notification_read',

  // Search and analytics events
  SEARCH_PERFORMED: 'search_performed',
  FILTER_CHANGED: 'filter_changed',
  FILTERS_RESET: 'filters_reset',
  TREND_UPDATED: 'trend_updated',
  STATS_UPDATED: 'stats_updated',

  // System events
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  MAINTENANCE_MODE: 'maintenance_mode'
};

// Message priority levels
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Utility functions for channel management
export class ChannelManager {
  constructor(ably) {
    this.ably = ably;
    this.activeChannels = new Map();
  }

  // Get or create a channel
  getChannel(channelName) {
    if (!this.activeChannels.has(channelName)) {
      const channel = this.ably.channels.get(channelName);
      this.activeChannels.set(channelName, channel);
    }
    return this.activeChannels.get(channelName);
  }

  // Subscribe to a channel with automatic cleanup and retry logic
  async subscribeToChannel(channelName, eventName, callback) {
    const channel = this.getChannel(channelName);

    const subscribeWithRetry = async (retryCount = 0) => {
      try {
        await channel.subscribe(eventName, callback);
        console.log(`✅ Successfully subscribed to ${channelName}:${eventName}`);
        return true;
      } catch (error) {
        console.error(`❌ Subscription failed for ${channelName}:${eventName}`, error);

        if (retryCount < 3) {
          console.log(`🔄 Retrying subscription (${retryCount + 1}/3) in ${(retryCount + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          return subscribeWithRetry(retryCount + 1);
        }

        throw error;
      }
    };

    await subscribeWithRetry();

    return () => {
      try {
        channel.unsubscribe(eventName, callback);
        console.log(`🔌 Unsubscribed from ${channelName}:${eventName}`);
      } catch (error) {
        console.error(`❌ Error unsubscribing from ${channelName}:${eventName}`, error);
      }
    };
  }

  // Publish to a channel
async publishToChannel(channelName, eventName, data, extras = {}) {
  try {
    const channel = this.getChannel(channelName);

    const message = {
      name: eventName,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      extras
    };

    return await channel.publish(message.name, message.data);
  } catch (error) {
    console.error('Error publishing to channel:', error);
    throw error;
  }
}

  // Enter presence on a channel
  async enterPresence(channelName, userData) {
    const channel = this.getChannel(channelName);
    return await channel.presence.enter(userData);
  }

  // Leave presence on a channel
  async leavePresence(channelName, userData) {
    const channel = this.getChannel(channelName);
    return await channel.presence.leave(userData);
  }

  // Update presence data
  async updatePresence(channelName, userData) {
    const channel = this.getChannel(channelName);
    return await channel.presence.update(userData);
  }

  // Get current presence members
  async getPresenceMembers(channelName) {
    const channel = this.getChannel(channelName);
    return await channel.presence.get();
  }

  // Cleanup all channels with proper error handling
  cleanup() {
    this.activeChannels.forEach((channel, channelName) => {
      try {
        // Remove all event listeners before detaching
        channel.off();

        // Leave presence if we're in it
        if (channel.presence) {
          channel.presence.leave().catch(err =>
            console.warn(`Warning: Could not leave presence for ${channelName}:`, err)
          );
        }

        // Detach the channel
        channel.detach();
        console.log(`🔌 Cleaned up channel: ${channelName}`);
      } catch (error) {
        console.error(`❌ Error cleaning up channel ${channelName}:`, error);
      }
    });

    this.activeChannels.clear();
  }
}

// Utility function for direct publishing (serverless-compatible with REST API)
export async function publishToChannel(channelName, eventName, data, extras = {}) {
  const ably = getServerAbly();
  if (!ably) {
    console.error('Cannot publish: Server Ably not available');
    return false;
  }

  const message = {
    name: eventName,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    extras
  };

  try {
    // REST API publish - stateless, serverless-compatible
    const channel = ably.channels.get(channelName);
    await channel.publish(message.name, message.data);

    console.log(`✅ Published to channel ${channelName}: ${eventName}`);
    return true;
  } catch (error) {
    console.error('Error publishing to channel:', error);

    // Retry once after brief delay for transient failures
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const channel = ably.channels.get(channelName);
      await channel.publish(message.name, message.data);
      console.log(`✅ Retry successful: Published to channel ${channelName}: ${eventName}`);
      return true;
    } catch (retryError) {
      console.error('Retry failed publishing to channel:', retryError);
      return false;
    }
  }
}

// Export configured instances
export { Ably };