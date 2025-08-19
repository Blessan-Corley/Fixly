'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPushSupport();
  }, []);

  const checkPushSupport = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    }
  };

  const subscribeToPush = async () => {
    if (!supported || !session) return;

    setLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('Push notifications permission denied');
        setLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      });

      // Send subscription to server
      const response = await fetch('/api/user/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (response.ok) {
        setSubscribed(true);
        toast.success('Push notifications enabled!');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
    }
    setLoading(false);
  };

  const unsubscribeFromPush = async () => {
    if (!supported || !session) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove subscription from server
        await fetch('/api/user/push-subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        setSubscribed(false);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Failed to disable push notifications');
    }
    setLoading(false);
  };

  const handleToggle = () => {
    if (subscribed) {
      unsubscribeFromPush();
    } else {
      subscribeToPush();
    }
  };

  // Don't show if not supported or no session
  if (!supported || !session) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">Push Notifications</h4>
        <p className="text-sm text-gray-600">
          Get instant alerts for jobs, messages, and updates
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          subscribed 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : subscribed ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {subscribed ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}