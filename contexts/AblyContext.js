/**
 * Ably Context Provider
 * Provides Ably real-time functionality throughout the app
 */

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getClientAbly, ChannelManager, CHANNELS, EVENTS } from '@/lib/ably';
import { useSession } from 'next-auth/react';
import { webPushService } from '@/lib/services/webPushService';

const AblyContext = createContext();

export function AblyProvider({ children }) {
  const { data: session } = useSession();
  const [ably, setAbly] = useState(null);
  const [channelManager, setChannelManager] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notifications, setNotifications] = useState([]);
  const cleanupRef = useRef([]);

  // Initialize Ably connection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ablyInstance = getClientAbly();

      // Update client ID when user logs in
      if (session?.user?.id && ablyInstance.auth.clientId !== session.user.id) {
        ablyInstance.auth.clientId = session.user.id;
      }

      setAbly(ablyInstance);
      setChannelManager(new ChannelManager(ablyInstance));

      // Monitor connection status
      ablyInstance.connection.on('connected', () => {
        console.log('🟢 Ably connected');
        setConnectionStatus('connected');
      });

      ablyInstance.connection.on('disconnected', () => {
        console.log('🔴 Ably disconnected');
        setConnectionStatus('disconnected');
      });

      ablyInstance.connection.on('suspended', () => {
        console.log('🟡 Ably suspended');
        setConnectionStatus('suspended');
      });

      ablyInstance.connection.on('connecting', () => {
        console.log('🔄 Ably connecting');
        setConnectionStatus('connecting');
      });

      ablyInstance.connection.on('failed', (error) => {
        console.error('❌ Ably connection failed:', error);
        setConnectionStatus('failed');
      });

      return () => {
        // Cleanup all subscriptions
        cleanupRef.current.forEach(cleanup => cleanup());
        cleanupRef.current = [];

        if (channelManager) {
          channelManager.cleanup();
        }

        ablyInstance.close();
      };
    }
  }, [session?.user?.id]);

  // Subscribe to user notifications when logged in
  useEffect(() => {
    if (session?.user?.id && channelManager) {
      const subscribeToNotifications = async () => {
        try {
          const unsubscribe = await channelManager.subscribeToChannel(
            CHANNELS.userNotifications(session.user.id),
            EVENTS.NOTIFICATION_SENT,
            (message) => {
              console.log('📢 New notification:', message.data);
              setNotifications(prev => [message.data, ...prev]);

              // Show browser notification if permission granted
              if (Notification.permission === 'granted') {
                new Notification(message.data.title || 'Fixly Notification', {
                  body: message.data.message,
                  icon: '/favicon.ico',
                  tag: message.data.messageId
                });
              }
            }
          );

          cleanupRef.current.push(unsubscribe);
        } catch (error) {
          console.error('Failed to subscribe to notifications:', error);
        }
      };

      subscribeToNotifications();
    }
  }, [session?.user?.id, channelManager]);

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

  const subscribeToChannel = async (channelName, eventName, callback) => {
    if (!channelManager) {
      console.error('Channel manager not initialized');
      return null;
    }

    try {
      const unsubscribe = await channelManager.subscribeToChannel(channelName, eventName, callback);
      cleanupRef.current.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to channel:', error);
      return null;
    }
  };

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

    // Connection status
    connectionStatus,
    isConnected: connectionStatus === 'connected',

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
    if (!channelName || !eventName) return;

    const wrappedCallback = (message) => {
      callbackRef.current(message);
    };

    let unsubscribe;

    const subscribe = async () => {
      unsubscribe = await subscribeToChannel(channelName, eventName, wrappedCallback);
    };

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
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