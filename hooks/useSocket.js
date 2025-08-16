'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Custom hook for Socket.io connection
export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!session?.accessToken || socket?.connected) return;

    console.log('🔌 Connecting to Socket.io...');
    setConnecting(true);
    setError(null);

    const newSocket = io(process.env.NEXTAUTH_URL || 'http://localhost:3000', {
      auth: {
        token: session.accessToken
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.io connected');
      setConnected(true);
      setConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      
      // Send online status
      newSocket.emit('user:online');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket.io disconnected:', reason);
      setConnected(false);
      setConnecting(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        setTimeout(() => {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            connect();
          }
        }, 2000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error);
      setConnected(false);
      setConnecting(false);
      setError(error.message);
      
      // Show error toast only on repeated failures
      if (reconnectAttemptsRef.current > 2) {
        toast.error('Connection issue', {
          description: 'Real-time features may not work properly'
        });
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket.io reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      
      toast.success('Connection restored', {
        description: 'Real-time features are now working'
      });
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Socket.io reconnection error:', error);
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError('Failed to reconnect');
        toast.error('Connection failed', {
          description: 'Please refresh the page to restore real-time features'
        });
      }
    });

    setSocket(newSocket);
  }, [session, socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.emit('user:away');
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setConnecting(false);
      setError(null);
    }
  }, [socket]);

  // Initialize connection when session is available
  useEffect(() => {
    if (session?.accessToken && !socket) {
      connect();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [session, socket, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    connected,
    connecting,
    error,
    connect,
    disconnect
  };
}

// Hook for job-specific real-time events
export function useJobSocket(jobId) {
  const { socket, connected } = useSocket();
  const [jobUpdates, setJobUpdates] = useState([]);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (!socket || !connected || !jobId) return;

    // Join job room
    socket.emit('join:job', jobId);

    // Listen for job updates
    const handleJobUpdate = (data) => {
      setJobUpdates(prev => [...prev, data]);
      
      toast.info('Job updated', {
        description: 'The job details have been modified'
      });
    };

    const handleApplicationUpdate = (data) => {
      setApplications(prev => [...prev, data]);
      
      if (data.status === 'accepted') {
        toast.success('Application accepted! 🎉', {
          description: 'Congratulations! Your application was accepted.'
        });
      } else if (data.status === 'rejected') {
        toast.error('Application not selected', {
          description: 'Thank you for your interest. Keep looking for other opportunities!'
        });
      }
    };

    socket.on('job:updated', handleJobUpdate);
    socket.on('application:updated', handleApplicationUpdate);

    return () => {
      socket.emit('leave:job', jobId);
      socket.off('job:updated', handleJobUpdate);
      socket.off('application:updated', handleApplicationUpdate);
    };
  }, [socket, connected, jobId]);

  const updateJob = useCallback((update) => {
    if (socket && connected) {
      socket.emit('job:update', { jobId, update });
    }
  }, [socket, connected, jobId]);

  const updateApplication = useCallback((applicationId, status, to) => {
    if (socket && connected) {
      socket.emit('application:update', { jobId, applicationId, status, to });
    }
  }, [socket, connected, jobId]);

  return {
    jobUpdates,
    applications,
    updateJob,
    updateApplication
  };
}

// Hook for real-time messaging
export function useMessageSocket(jobId) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket || !connected || !jobId) return;

    // Join messages room
    socket.emit('join:messages', jobId);

    // Listen for new messages
    const handleNewMessage = (data) => {
      setMessages(prev => [...prev, data]);
      
      // Show toast for new messages (optional)
      if (data.from !== socket.userId) {
        toast.info('New message', {
          description: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : '')
        });
      }
    };

    const handleTypingStart = (data) => {
      setTypingUsers(prev => new Set([...prev, data.userId]));
    };

    const handleTypingStop = (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.emit('leave:messages', jobId);
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, connected, jobId]);

  const sendMessage = useCallback((message, to = null) => {
    if (socket && connected) {
      socket.emit('message:send', { jobId, message, to });
    }
  }, [socket, connected, jobId]);

  const startTyping = useCallback(() => {
    if (socket && connected) {
      socket.emit('typing:start', { jobId });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  }, [socket, connected, jobId]);

  const stopTyping = useCallback(() => {
    if (socket && connected) {
      socket.emit('typing:stop', { jobId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [socket, connected, jobId]);

  return {
    messages,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    startTyping,
    stopTyping
  };
}

// Hook for real-time notifications
export function useNotificationSocket() {
  const { socket, connected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.info(notification.title, {
        description: notification.message,
        action: notification.actionUrl ? {
          label: 'View',
          onClick: () => window.location.href = notification.actionUrl
        } : undefined
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, connected]);

  const sendNotification = useCallback((to, notification) => {
    if (socket && connected) {
      socket.emit('notification:send', { to, notification });
    }
  }, [socket, connected]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  return {
    notifications,
    unreadCount,
    sendNotification,
    markAsRead
  };
}

// Hook for user presence/online status
export function usePresenceSocket() {
  const { socket, connected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState(new Map());

  useEffect(() => {
    if (!socket || !connected) return;

    const handleUserStatus = (data) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        if (data.status === 'offline') {
          newMap.delete(data.userId);
        } else {
          newMap.set(data.userId, {
            status: data.status,
            lastSeen: data.timestamp
          });
        }
        return newMap;
      });
    };

    socket.on('user:status', handleUserStatus);

    return () => {
      socket.off('user:status', handleUserStatus);
    };
  }, [socket, connected]);

  const setUserStatus = useCallback((status) => {
    if (socket && connected) {
      socket.emit(`user:${status}`);
    }
  }, [socket, connected]);

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId) && onlineUsers.get(userId)?.status === 'online';
  }, [onlineUsers]);

  return {
    onlineUsers,
    setUserStatus,
    isUserOnline
  };
}

export default useSocket;