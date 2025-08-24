'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export function useRealtime(userId, options = {}) {
  const {
    autoConnect = true,
    enableNotifications = true,
    enablePushNotifications = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000
  } = options;
  
  // Connection state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  
  // Data state
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userPresence, setUserPresence] = useState(new Map());
  
  // Refs
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const sessionIdRef = useRef(null);
  
  // Connect to SSE
  const connect = useCallback(() => {
    if (!userId || connecting || connected) return;
    
    setConnecting(true);
    setError(null);
    
    console.log(`🔗 Connecting to real-time service for user: ${userId}`);
    
    try {
      // Create EventSource connection
      const eventSource = new EventSource(
        `/api/realtime/connect?userId=${encodeURIComponent(userId)}`
      );
      eventSourceRef.current = eventSource;
      
      // Connection opened
      eventSource.onopen = () => {
        console.log('✅ Real-time connection established');
        setConnected(true);
        setConnecting(false);
        setError(null);
        setReconnectCount(0);
        
        if (enableNotifications && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            console.log('📱 Notification permission:', permission);
          });
        }
      };
      
      // Message received
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeMessage(data);
        } catch (error) {
          console.error('Error parsing real-time message:', error);
        }
      };
      
      // Connection error
      eventSource.onerror = (error) => {
        console.error('❌ Real-time connection error:', error);
        setConnected(false);
        setConnecting(false);
        setError(error);
        
        // Attempt reconnection
        if (reconnectCount < reconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectCount);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectCount + 1}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            cleanup();
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          toast.error('Real-time connection lost. Please refresh the page.');
        }
      };
      
    } catch (error) {
      console.error('Failed to establish real-time connection:', error);
      setConnecting(false);
      setError(error);
    }
  }, [userId, connecting, connected, reconnectCount, reconnectAttempts, reconnectDelay, enableNotifications]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    cleanup();
    setConnected(false);
    setConnecting(false);
    console.log('🔌 Real-time connection disconnected');
  }, []);
  
  // Cleanup connections and timers
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  // Handle incoming real-time messages
  const handleRealtimeMessage = useCallback((data) => {
    switch (data.type) {
      case 'connection':
        sessionIdRef.current = data.sessionId;
        console.log('📡 Real-time session established:', data.sessionId);
        break;
        
      case 'notification':
        handleNotification(data.data);
        break;
        
      case 'message_received':
        handleMessage(data.data);
        break;
        
      case 'job_update':
        handleJobUpdate(data.data);
        break;
        
      default:
        console.log('📨 Real-time message:', data.type, data);
    }
  }, []);
  
  // Handle notifications
  const handleNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 99)]);
    
    // Show toast notification
    toast(notification.title, {
      description: notification.message,
      action: notification.actions?.[0] ? {
        label: notification.actions[0].label,
        onClick: () => window.location.href = notification.actions[0].url
      } : undefined
    });
    
    // Show browser notification if permission granted
    if (enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority >= 3
        });
        
        if (notification.actions?.[0]?.url) {
          browserNotification.onclick = () => {
            window.focus();
            window.location.href = notification.actions[0].url;
            browserNotification.close();
          };
        }
        
        if (notification.priority < 3) {
          setTimeout(() => browserNotification.close(), 5000);
        }
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }
  }, [enableNotifications]);
  
  // Handle messages
  const handleMessage = useCallback((message) => {
    setMessages(prev => [message, ...prev.slice(0, 199)]);
    
    toast('New Message', {
      description: `${message.senderName || 'Someone'}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
      action: {
        label: 'View',
        onClick: () => window.location.href = `/dashboard/messages/${message.conversationId}`
      }
    });
  }, []);
  
  // Handle job updates
  const handleJobUpdate = useCallback((data) => {
    toast('Job Update', {
      description: `Job ${data.status}: ${data.jobTitle || 'Your job'}`,
      action: {
        label: 'View',
        onClick: () => window.location.href = `/dashboard/jobs/${data.jobId}`
      }
    });
  }, []);
  
  // API methods
  const sendMessage = useCallback(async (recipientId, content, type = 'text', metadata = {}) => {
    try {
      const response = await fetch('/api/realtime/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: userId,
          recipientId,
          content,
          type,
          metadata
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  }, [userId]);
  
  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true, readAt: Date.now() }
          : notif
      ));
      
      await fetch('/api/realtime/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId })
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [userId]);
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && userId && !connected && !connecting) {
      connect();
    }
    
    return cleanup;
  }, [autoConnect, userId, connected, connecting, connect, cleanup]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
  return {
    connected,
    connecting,
    error,
    sessionId: sessionIdRef.current,
    notifications,
    messages,
    unreadNotifications: notifications.filter(n => !n.read).length,
    unreadMessages: messages.filter(m => !m.read).length,
    connect,
    disconnect,
    sendMessage,
    markNotificationAsRead
  };
}