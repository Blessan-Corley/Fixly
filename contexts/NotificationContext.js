'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getNotificationManager } from '../lib/realtime/NotificationManager';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export function NotificationProvider({ children }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { socket, connected } = useSocket();
  
  // State management with performance optimizations
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Performance refs
  const lastUpdateRef = useRef(0);
  const updateTimeoutRef = useRef(null);
  const managerRef = useRef(null);

  // Get notification manager instance
  const notificationManager = useMemo(() => {
    if (!managerRef.current) {
      managerRef.current = getNotificationManager();
    }
    return managerRef.current;
  }, []);

  // Initialize manager when socket is available
  useEffect(() => {
    if (socket && connected && session?.user && !isInitialized) {
      const initializeManager = async () => {
        try {
          await notificationManager.initialize(socket);
          setIsInitialized(true);
          
          // Get initial data from cache
          const initialNotifications = notificationManager.getNotifications();
          const initialUnreadCount = notificationManager.getUnreadCount();
          
          setNotifications(initialNotifications);
          setUnreadCount(initialUnreadCount);
        } catch (error) {
          console.error('❌ Failed to initialize notification manager:', error);
        }
      };

      initializeManager();
    }
  }, [socket, connected, session?.user, isInitialized, notificationManager]);

  // Listen to manager events with throttling
  useEffect(() => {
    if (!isInitialized) return;

    const throttledUpdate = (callback) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 16) { // ~60fps throttling
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(callback, 16);
      } else {
        lastUpdateRef.current = now;
        callback();
      }
    };

    const handleNotificationAdded = (notification) => {
      throttledUpdate(() => {
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep max 50
      });
    };

    const handleNotificationUpdated = (notification) => {
      throttledUpdate(() => {
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? notification : n)
        );
      });
    };

    const handleNotificationDeleted = (notificationId) => {
      throttledUpdate(() => {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      });
    };

    const handleBulkUpdated = (notificationIds) => {
      throttledUpdate(() => {
        const updatedNotifications = notificationManager.getNotifications();
        setNotifications(updatedNotifications.slice(0, 50));
      });
    };

    const handleCountChanged = (newCount) => {
      setUnreadCount(newCount);
    };

    const handleSynced = (syncedNotifications) => {
      throttledUpdate(() => {
        setNotifications(syncedNotifications.slice(0, 50));
      });
    };

    // Attach event listeners
    notificationManager.on('notification:added', handleNotificationAdded);
    notificationManager.on('notification:updated', handleNotificationUpdated);
    notificationManager.on('notification:deleted', handleNotificationDeleted);
    notificationManager.on('notifications:bulk_updated', handleBulkUpdated);
    notificationManager.on('count:changed', handleCountChanged);
    notificationManager.on('notifications:synced', handleSynced);

    return () => {
      // Cleanup event listeners
      notificationManager.off('notification:added', handleNotificationAdded);
      notificationManager.off('notification:updated', handleNotificationUpdated);
      notificationManager.off('notification:deleted', handleNotificationDeleted);
      notificationManager.off('notifications:bulk_updated', handleBulkUpdated);
      notificationManager.off('count:changed', handleCountChanged);
      notificationManager.off('notifications:synced', handleSynced);
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [isInitialized, notificationManager]);

  // Action handlers using the optimized manager
  const fetchNotifications = useCallback(async (page = 1, filter = 'all') => {
    if (!isInitialized) return { notifications: [], unreadCount: 0 };
    
    setLoading(page === 1);
    try {
      // Use cached data first for instant response
      const cachedNotifications = notificationManager.getNotifications({ 
        unreadOnly: filter === 'unread' 
      });
      
      if (page === 1) {
        setNotifications(cachedNotifications.slice(0, 20));
      }
      
      // Background sync if needed
      if (Date.now() - notificationManager.lastSyncTime > 30000) { // 30 seconds
        await notificationManager.syncNotifications();
      }
      
      return {
        notifications: cachedNotifications.slice((page - 1) * 20, page * 20),
        unreadCount: notificationManager.getUnreadCount()
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], unreadCount: 0 };
    } finally {
      setLoading(false);
    }
  }, [isInitialized, notificationManager]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isInitialized) return 0;
    return notificationManager.getUnreadCount();
  }, [isInitialized, notificationManager]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!isInitialized) return false;
    await notificationManager.markAsRead(notificationId);
    return true;
  }, [isInitialized, notificationManager]);

  const markAllAsRead = useCallback(async () => {
    if (!isInitialized) return false;
    await notificationManager.markAllAsRead();
    toast.success('All notifications marked as read');
    return true;
  }, [isInitialized, notificationManager]);

  const handleNotificationClick = useCallback(async (notification) => {
    // Mark as read if unread (instant optimistic update)
    if (!notification.read) {
      await markAsRead(notification._id || notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    } else {
      // Default navigation based on notification type
      const defaultNavigation = getDefaultNavigationForType(notification.type, notification.data);
      if (defaultNavigation) {
        router.push(defaultNavigation);
      }
    }
  }, [markAsRead, router]);

  const getDefaultNavigationForType = (type, data) => {
    switch (type) {
      case 'job_applied':
      case 'job_assigned':
      case 'job_completed':
      case 'job_cancelled':
      case 'job_disputed':
        return data?.jobId ? `/dashboard/jobs/${data.jobId}` : '/dashboard/jobs';
      
      case 'message':
        return data?.jobId ? `/dashboard/jobs/${data.jobId}/messages` : '/dashboard/messages';
      
      case 'payment_received':
      case 'payment_pending':
        return '/dashboard/earnings';
      
      case 'rating_received':
        return '/dashboard/profile';
      
      case 'application_sent':
        return '/dashboard/applications';
      
      case 'verification_success':
      case 'phone_verified':
      case 'email_verified':
        return '/dashboard/settings';
      
      case 'subscription_success':
      case 'subscription_cancelled':
        return '/dashboard/subscription';
      
      default:
        return '/dashboard/notifications';
    }
  };

  const sendNotification = useCallback(async (userId, notification) => {
    if (!socket || !connected) return false;

    try {
      // Send via socket for real-time delivery
      socket.emit('notification:send', { to: userId, notification });
      
      // Also save to database via API (queued for performance)
      notificationManager.queueRequest(async () => {
        const response = await fetch('/api/user/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            actionUrl: notification.actionUrl
          })
        });
        return response.ok;
      });

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [socket, connected, notificationManager]);

  const createJobNotification = useCallback((jobId, type, title, message, recipientId, extraData = {}) => {
    return sendNotification(recipientId, {
      type,
      title,
      message,
      data: { jobId, ...extraData },
      actionUrl: `/dashboard/jobs/${jobId}`
    });
  }, [sendNotification]);

  const createMessageNotification = useCallback((jobId, senderId, recipientId, messagePreview) => {
    return sendNotification(recipientId, {
      type: 'message',
      title: 'New Message',
      message: messagePreview,
      data: { jobId, senderId },
      actionUrl: `/dashboard/jobs/${jobId}/messages`
    });
  }, [sendNotification]);

  const createPaymentNotification = useCallback((amount, type, recipientId, extraData = {}) => {
    return sendNotification(recipientId, {
      type,
      title: type === 'payment_received' ? 'Payment Received' : 'Payment Pending',
      message: `₹${amount} ${type === 'payment_received' ? 'has been credited to your account' : 'is pending'}`,
      data: { amount, ...extraData },
      actionUrl: '/dashboard/earnings'
    });
  }, [sendNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Memoized value for performance
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    connected,
    isInitialized,
    
    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    sendNotification,
    
    // Convenience methods for common notifications
    createJobNotification,
    createMessageNotification,
    createPaymentNotification,
    
    // Real-time status
    isRealTimeConnected: connected && isInitialized
  }), [
    notifications,
    unreadCount,
    loading,
    connected,
    isInitialized,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    sendNotification,
    createJobNotification,
    createMessageNotification,
    createPaymentNotification
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Export individual hooks for specific use cases
export const useNotificationActions = () => {
  const context = useNotifications();
  return {
    sendNotification: context.sendNotification,
    createJobNotification: context.createJobNotification,
    createMessageNotification: context.createMessageNotification,
    createPaymentNotification: context.createPaymentNotification
  };
};

export const useNotificationState = () => {
  const context = useNotifications();
  return {
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    loading: context.loading,
    isRealTimeConnected: context.isRealTimeConnected
  };
};