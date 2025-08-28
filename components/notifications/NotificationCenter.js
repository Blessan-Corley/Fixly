// Comprehensive Notification Center
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getPushNotificationManager } from '../../lib/notifications/PushNotificationManager';
import { useResponsive } from '../ui/ResponsiveLayout';

const NotificationCenter = () => {
  const { isMobile, screenSize } = useResponsive();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [pushManager, setPushManager] = useState(null);
  const [pushPermission, setPushPermission] = useState('default');
  const [preferences, setPreferences] = useState({
    messages: true,
    jobUpdates: true,
    applications: true,
    system: true,
    marketing: false,
    sound: true,
    desktop: true
  });

  // Initialize push notification manager
  useEffect(() => {
    const manager = getPushNotificationManager();
    setPushManager(manager);
    setPushPermission(manager.getPermission());

    // Listen for permission changes
    const handlePermissionChange = (event) => {
      setPushPermission(event.detail.permission);
    };

    manager.on('permissionChanged', handlePermissionChange);
    manager.initialize();

    return () => {
      manager.off('permissionChanged', handlePermissionChange);
    };
  }, []);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/user/notifications/mark-all-read', {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/user/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const notif = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notif && !notif.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      const response = await fetch('/api/user/notifications/clear-all', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }, []);

  // Request push permission
  const requestPushPermission = useCallback(async () => {
    if (pushManager) {
      try {
        const permission = await pushManager.requestPermission();
        setPushPermission(permission);
        
        if (permission === 'granted') {
          await updatePreferences({ ...preferences, desktop: true });
        }
      } catch (error) {
        console.error('Error requesting push permission:', error);
      }
    }
  }, [pushManager, preferences]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences) => {
    try {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      });
      
      if (response.ok) {
        setPreferences(newPreferences);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, []);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter(notif => notif.type === filter);
  }, [notifications, filter]);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
    
    // Set up SSE connection for real-time notifications
    const eventSource = new EventSource('/api/user/notifications/stream');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_notification') {
        const newNotification = data.notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show desktop notification if enabled
        if (pushManager && preferences.desktop && pushPermission === 'granted') {
          const template = pushManager.getNotificationTemplate(newNotification.type, newNotification.data);
          pushManager.showNotification(template.title, template);
        }
        
        // Play sound if enabled
        if (preferences.sound) {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(() => {}); // Ignore errors
        }
      }
    };

    return () => {
      eventSource.close();
    };
  }, [fetchNotifications, pushManager, preferences, pushPermission]);

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return time.toLocaleDateString();
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      message: '💬',
      jobUpdate: '💼',
      application: '📋',
      system: '⚙️',
      marketing: '📢'
    };
    return icons[type] || '📋';
  };

  // Notification types for filter
  const notificationTypes = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'message', label: 'Messages', count: notifications.filter(n => n.type === 'message').length },
    { value: 'jobUpdate', label: 'Jobs', count: notifications.filter(n => n.type === 'jobUpdate').length },
    { value: 'application', label: 'Applications', count: notifications.filter(n => n.type === 'application').length },
    { value: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
  ];

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-full transition-all duration-200
          ${isMobile ? 'bg-gray-100' : 'bg-white shadow-sm border'}
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
        `}
        aria-label="Notifications"
      >
        <svg 
          className="w-6 h-6 text-gray-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-5 5M10 21a1 1 0 001-1m0 0a1 1 0 001-1m0 0h3m-4 1V10a6 6 0 1112 0v7l2 2H5l2-2z" 
          />
        </svg>
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          {isMobile && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />
          )}
          
          <div className={`
            absolute z-50 bg-white rounded-lg shadow-xl border
            ${isMobile ? 
              'fixed inset-x-4 top-16 bottom-16 overflow-hidden' : 
              'right-0 top-12 w-96 max-h-[600px]'
            }
          `}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                )}
                
                {!isMobile && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-gray-100">
              <div className="flex flex-wrap gap-2">
                {notificationTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFilter(type.value)}
                    className={`
                      px-3 py-1 rounded-full text-sm font-medium transition-colors
                      ${filter === type.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {type.label} {type.count > 0 && `(${type.count})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Push notification setup */}
            {pushPermission === 'default' && (
              <div className="p-4 bg-blue-50 border-b">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 mb-2">
                      Enable desktop notifications to stay updated on new messages and job updates.
                    </p>
                    <button
                      onClick={requestPushPermission}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Enable Notifications
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-gray-500">
                    {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`
                        p-4 hover:bg-gray-50 transition-colors cursor-pointer
                        ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                      `}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.body}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-2">
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Delete notification"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => {/* Open preferences modal */}}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Preferences
                </button>
                
                <button
                  onClick={clearAll}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;