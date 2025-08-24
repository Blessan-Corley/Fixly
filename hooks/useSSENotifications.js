'use client';

import { useState, useEffect, useRef } from 'react';

export function useSSENotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  
  useEffect(() => {
    if (!userId) return;
    
    // Create EventSource connection
    const eventSource = new EventSource(`/api/realtime/notifications?userId=${userId}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('✅ SSE Connected');
      setConnected(true);
      setError(null);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            console.log('📡 Real-time notifications activated');
            break;
            
          case 'notification':
            setNotifications(prev => [data.data, ...prev]);
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification(data.data.title, {
                body: data.data.message,
                icon: '/favicon.ico'
              });
            }
            break;
            
          case 'message':
            console.log('💬 New message:', data.data);
            // Handle new messages
            break;
            
          default:
            console.log('📨 SSE data:', data);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE Error:', error);
      setError(error);
      setConnected(false);
      
      // EventSource automatically reconnects, but we can handle custom logic here
    };
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [userId]);
  
  // Clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };
  
  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };
  
  return {
    notifications,
    connected,
    error,
    clearNotifications,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length
  };
}