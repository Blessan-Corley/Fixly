'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAbly } from '../../contexts/AblyContext';

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const { isConnected } = useAbly();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = async () => {
    // Check if browser supports Notifications API
    if ('Notification' in window) {
      setSupported(true);

      // Check current permission status
      const permission = await Notification.permission;
      setEnabled(permission === 'granted');
    }
  };

  const enableNotifications = async () => {
    if (!supported || !session) return;

    setLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        toast.error('Browser notifications permission denied');
        setLoading(false);
        return;
      }

      // Save preference to user settings
      const response = await fetch('/api/user/notification-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          browserNotifications: true
        })
      });

      if (response.ok) {
        setEnabled(true);

        // Show a test notification
        new Notification('Fixly Notifications Enabled', {
          body: 'You will now receive real-time notifications for jobs, messages, and updates!',
          icon: '/fixly-logo.png',
          badge: '/fixly-badge.png',
          tag: 'welcome-notification'
        });

        toast.success('Browser notifications enabled! You\'ll receive real-time alerts via Ably.');
      } else {
        throw new Error('Failed to save notification preferences');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    }
    setLoading(false);
  };

  const disableNotifications = async () => {
    if (!supported || !session) return;

    setLoading(true);
    try {
      // Save preference to user settings
      const response = await fetch('/api/user/notification-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          browserNotifications: false
        })
      });

      if (response.ok) {
        setEnabled(false);
        toast.success('Browser notifications disabled');
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    }
    setLoading(false);
  };

  const handleToggle = () => {
    if (enabled) {
      disableNotifications();
    } else {
      enableNotifications();
    }
  };

  // Don't show if not supported or no session
  if (!supported || !session) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-fixly-surface dark:bg-fixly-card rounded-lg border border-fixly-border">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-fixly-text">Browser Notifications</h4>
          {isConnected && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live via Ably
            </span>
          )}
        </div>
        <p className="text-sm text-fixly-text-muted">
          Get instant browser alerts for jobs, messages, and updates in real-time
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          enabled
            ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30'
            : 'bg-fixly-primary-bg text-fixly-primary hover:bg-fixly-primary-bg/80'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : enabled ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}