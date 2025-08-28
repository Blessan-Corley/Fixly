'use client';

import { useState, useEffect } from 'react';
import { useResponsive } from '../ui/ResponsiveLayout';

const InAppNotifications = ({ className = '' }) => {
  const { isMobile } = useResponsive();
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Listen for new notifications from various sources
    const handleNewNotification = (event) => {
      const { type, data, title, message } = event.detail;
      addNotification({
        id: Date.now() + Math.random(),
        type,
        title: title || getDefaultTitle(type),
        message: message || data?.message || 'New update',
        timestamp: new Date(),
        read: false,
        data
      });
    };

    // Listen for real-time events
    window.addEventListener('newMessage', handleNewNotification);
    window.addEventListener('jobUpdate', handleNewNotification);
    window.addEventListener('applicationUpdate', handleNewNotification);
    window.addEventListener('systemNotification', handleNewNotification);

    return () => {
      window.removeEventListener('newMessage', handleNewNotification);
      window.removeEventListener('jobUpdate', handleNewNotification);
      window.removeEventListener('applicationUpdate', handleNewNotification);
      window.removeEventListener('systemNotification', handleNewNotification);
    };
  }, []);

  const getDefaultTitle = (type) => {
    const titles = {
      message: 'New Message',
      job: 'Job Update',
      application: 'Application Update',
      payment: 'Payment',
      system: 'Update'
    };
    return titles[type] || 'Notification';
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    const icons = {
      message: '💬',
      job: '💼',
      application: '📝',
      payment: '💰',
      system: '🔔',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type) => {
    const colors = {
      message: 'bg-blue-50 border-blue-200 text-blue-800',
      job: 'bg-green-50 border-green-200 text-green-800',
      application: 'bg-purple-50 border-purple-200 text-purple-800',
      payment: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      system: 'bg-gray-50 border-gray-200 text-gray-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  if (!isVisible || notifications.length === 0) return null;

  return (
    <div className={`fixed ${isMobile ? 'top-4 left-4 right-4' : 'top-4 right-4'} z-50 space-y-2 ${className}`}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            rounded-lg border p-3 shadow-lg backdrop-blur-sm animate-slide-down
            ${getNotificationColor(notification.type)}
            ${isMobile ? 'max-w-full' : 'max-w-sm'}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <span className="text-lg flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                  {notification.title}
                </p>
                <p className="text-xs mt-1 opacity-80">
                  {notification.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-current opacity-50 hover:opacity-80 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Toast notification helper
export const showToast = (type, title, message, data = null) => {
  const event = new CustomEvent(type, {
    detail: { type, title, message, data }
  });
  window.dispatchEvent(event);
};

// Specific notification helpers
export const showMessage = (message, sender = '') => {
  showToast('newMessage', 'New Message', sender ? `From ${sender}` : message);
};

export const showJobUpdate = (message, jobTitle = '') => {
  showToast('jobUpdate', 'Job Update', jobTitle ? `${jobTitle}: ${message}` : message);
};

export const showSuccess = (message) => {
  showToast('systemNotification', '✅ Success', message, { type: 'success' });
};

export const showError = (message) => {
  showToast('systemNotification', '❌ Error', message, { type: 'error' });
};

export const showWarning = (message) => {
  showToast('systemNotification', '⚠️ Warning', message, { type: 'warning' });
};

export const showInfo = (message) => {
  showToast('systemNotification', 'ℹ️ Info', message, { type: 'info' });
};

export default InAppNotifications;