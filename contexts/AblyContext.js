/**
 * Ably Context Provider
 * Provides Ably real-time functionality throughout the app
 */

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { getClientAbly, ChannelManager, CHANNELS, EVENTS } from '@/lib/ably';
import { useSession } from 'next-auth/react';
import { webPushService } from '@/lib/services/webPushService';
import { useAblyConnection } from '@/hooks/useAblyConnection';

const AblyContext = createContext();

export function AblyProvider({ children }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const cleanupRef = useRef([]);

  // Use the enhanced connection hook
  const {
    ably,
    connectionStatus,
    isConnected,
    reconnect,
    healthCheck
  } = useAblyConnection();

  const [channelManager, setChannelManager] = useState(null);

  // Initialize channel manager when ably is available
  useEffect(() => {
    if (ably && connectionStatus !== 'disabled') {
      // Update client ID when user logs in
      if (session?.user?.id && ably.auth.clientId !== session.user.id) {
        ably.auth.clientId = session.user.id;
      }

      const newChannelManager = new ChannelManager(ably);
      setChannelManager(newChannelManager);

      return () => {
        // Cleanup all subscriptions first (in parallel for faster cleanup)
        const currentCleanups = [...cleanupRef.current];
        cleanupRef.current = [];

        // Run all cleanup functions in parallel using Promise.allSettled
        Promise.allSettled(
          currentCleanups.map(cleanup =>
            Promise.resolve().then(() => {
              if (typeof cleanup === 'function') {
                cleanup();
              }
            })
          )
        ).catch(error => {
          console.error('❌ Error during parallel cleanup:', error);
        });

        // Cleanup the channel manager
        if (newChannelManager) {
          try {
            newChannelManager.cleanup();
          } catch (error) {
            console.error('❌ Error during channel manager cleanup:', error);
          }
        }
      };
    }
  }, [ably, session?.user?.id, connectionStatus]);

  // Subscribe to user notifications when logged in
  useEffect(() => {
    if (session?.user?.id && channelManager && connectionStatus === 'connected') {
      let isSubscriptionActive = true;
      let timeoutId;
      let unsubscribe;

      const subscribeToNotifications = async () => {
        if (!isSubscriptionActive) return;

        try {
          console.log(`📧 Subscribing to notifications for user: ${session.user.id}`);

          unsubscribe = await channelManager.subscribeToChannel(
            CHANNELS.userNotifications(session.user.id),
            EVENTS.NOTIFICATION_SENT,
            (message) => {
              if (!isSubscriptionActive) return;

              console.log('📢 New notification:', message.data);
              setNotifications(prev => [message.data, ...prev.slice(0, 49)]);

              // Show browser notification if permission granted
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(message.data.title || 'Fixly Notification', {
                  body: message.data.message,
                  icon: '/favicon.ico',
                  tag: message.data.messageId
                });
              }

              // Also handle push notifications for mobile
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: 'SHOW_NOTIFICATION',
                  payload: {
                    title: message.data.title || 'Fixly Notification',
                    body: message.data.message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: message.data.messageId
                  }
                });
              }
            }
          );

          if (isSubscriptionActive && unsubscribe) {
            cleanupRef.current.push(unsubscribe);
            console.log('✅ Successfully subscribed to notifications');
          }
        } catch (error) {
          console.error('Failed to subscribe to notifications:', error);
        }
      };

      // Add a small delay to ensure connection is stable
      timeoutId = setTimeout(subscribeToNotifications, 500);

      return () => {
        isSubscriptionActive = false;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (unsubscribe && typeof unsubscribe === 'function') {
          try {
            unsubscribe();
          } catch (error) {
            console.error('❌ Error unsubscribing from notifications:', error);
          }
        }
      };
    }
  }, [session?.user?.id, channelManager, connectionStatus]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      }
    }
  }, []);

  // Helper functions
  const publishMessage = async (channelName, eventName, data, extras = {}) => {
    if (!channelManager) {
      console.error('Channel manager not initialized');
      return false;
    }

    try {
      await channelManager.publishToChannel(channelName, eventName, data, extras);
      return true;
    } catch (error) {
      console.error('Failed to publish message:', error);
      return false;
    }
  };

  const subscribeToChannel = useCallback(async (channelName, eventName, callback) => {
    if (!channelManager) {
      console.error('Channel manager not initialized');
      return () => {}; // Return empty cleanup function
    }

    // Validate channel name for null/undefined values
    if (!channelName ||
        channelName.includes('null') ||
        channelName.includes('undefined') ||
        channelName.includes(':null:') ||
        channelName.includes(':undefined:') ||
        channelName.endsWith(':null') ||
        channelName.endsWith(':undefined')) {
      console.warn(`⚠️ Invalid channel name: ${channelName} - skipping subscription`);
      return () => {}; // Return empty cleanup function
    }

    let isMounted = true;

    try {
      const unsubscribe = await channelManager.subscribeToChannel(channelName, eventName, callback);

      // Only add cleanup if component is still mounted
      if (isMounted && typeof unsubscribe === 'function') {
        cleanupRef.current.push(unsubscribe);
      }

      setConnectionError(null); // Clear any previous errors on successful subscription

      return () => {
        isMounted = false;
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error('Failed to subscribe to channel:', error);
      setConnectionError(`Failed to subscribe to ${channelName}: ${error.message}`);
      return () => {}; // Return empty cleanup function on error
    }
  }, [channelManager]);

  const enterPresence = async (channelName, userData) => {
    if (!channelManager) return false;

    try {
      await channelManager.enterPresence(channelName, {
        userId: session?.user?.id,
        userName: session?.user?.name,
        userAvatar: session?.user?.image,
        ...userData
      });
      return true;
    } catch (error) {
      console.error('Failed to enter presence:', error);
      return false;
    }
  };

  const leavePresence = async (channelName) => {
    if (!channelManager) return false;

    try {
      await channelManager.leavePresence(channelName);
      return true;
    } catch (error) {
      console.error('Failed to leave presence:', error);
      return false;
    }
  };

  const getPresenceMembers = async (channelName) => {
    if (!channelManager) return [];

    try {
      return await channelManager.getPresenceMembers(channelName);
    } catch (error) {
      console.error('Failed to get presence members:', error);
      return [];
    }
  };

  // Clear notification
  const clearNotification = (messageId) => {
    setNotifications(prev => prev.filter(n => n.messageId !== messageId));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const contextValue = {
    // Core instances
    ably,
    channelManager,

    // Connection status and controls
    connectionStatus,
    isConnected,
    reconnect,
    healthCheck,
    connectionError,

    // Notifications
    notifications,
    clearNotification,
    clearAllNotifications,

    // Publishing
    publishMessage,

    // Subscribing
    subscribeToChannel,

    // Presence
    enterPresence,
    leavePresence,
    getPresenceMembers,

    // Utilities
    CHANNELS,
    EVENTS,

    // User info
    currentUser: session?.user
  };

  return (
    <AblyContext.Provider value={contextValue}>
      {children}
    </AblyContext.Provider>
  );
}

// Custom hook to use Ably context
export function useAbly() {
  const context = useContext(AblyContext);
  if (!context) {
    throw new Error('useAbly must be used within an AblyProvider');
  }
  return context;
}

// Custom hook for subscribing to a channel (with automatic cleanup)
export function useAblyChannel(channelName, eventName, callback, dependencies = []) {
  const { subscribeToChannel } = useAbly();
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Early return if channel name is invalid or null
    if (!channelName ||
        !eventName ||
        channelName.includes('null') ||
        channelName.includes('undefined') ||
        channelName.includes(':null:') ||
        channelName.includes(':undefined:') ||
        channelName.endsWith(':null') ||
        channelName.endsWith(':undefined')) {
      return;
    }

    const wrappedCallback = (message) => {
      callbackRef.current(message);
    };

    let unsubscribe;

    const subscribe = async () => {
      unsubscribe = await subscribeToChannel(channelName, eventName, wrappedCallback);
    };

    subscribe();

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error during channel cleanup:', error);
        }
      }
    };
  }, [channelName, eventName, subscribeToChannel, ...dependencies]);
}

// Custom hook for presence on a channel
export function useAblyPresence(channelName, userData, shouldEnter = true) {
  const { enterPresence, leavePresence, getPresenceMembers } = useAbly();
  const [presenceMembers, setPresenceMembers] = useState([]);

  useEffect(() => {
    if (!channelName || !shouldEnter) return;

    const handlePresence = async () => {
      // Enter presence
      await enterPresence(channelName, userData);

      // Get initial presence members
      const members = await getPresenceMembers(channelName);
      setPresenceMembers(members);
    };

    handlePresence();

    return () => {
      // Leave presence on cleanup
      leavePresence(channelName);
    };
  }, [channelName, shouldEnter, enterPresence, leavePresence, getPresenceMembers]);

  return presenceMembers;
}