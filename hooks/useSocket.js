'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Performance-optimized Socket.io connection pool
class SocketConnectionPool {
  constructor() {
    this.connections = new Map();
    this.maxConnections = 3;
    this.connectionTimeout = 20000;
    this.heartbeatInterval = 25000;
  }

  getConnection(sessionId) {
    return this.connections.get(sessionId);
  }

  createConnection(sessionId, accessToken) {
    if (this.connections.size >= this.maxConnections) {
      // Clean up oldest connection
      const oldestKey = this.connections.keys().next().value;
      this.destroyConnection(oldestKey);
    }

    // Detect if running in PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true;

    const socket = io(process.env.NEXTAUTH_URL || 'http://localhost:3000', {
      auth: { 
        token: accessToken,
        isPWA: isPWA,
        userAgent: navigator.userAgent
      },
      transports: ['websocket', 'polling'],
      timeout: this.connectionTimeout,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: isPWA ? 10 : 5, // More attempts for PWA
      reconnectionDelay: 1000,
      reconnectionDelayMax: isPWA ? 10000 : 5000, // Longer delays for PWA
      randomizationFactor: 0.5,
      pingTimeout: 60000,
      pingInterval: this.heartbeatInterval,
      // PWA-specific optimizations
      upgrade: true,
      rememberUpgrade: true,
      forceBase64: false
    });

    this.connections.set(sessionId, socket);
    return socket;
  }

  destroyConnection(sessionId) {
    const socket = this.connections.get(sessionId);
    if (socket) {
      socket.disconnect();
      this.connections.delete(sessionId);
    }
  }

  destroyAll() {
    this.connections.forEach((socket, sessionId) => {
      this.destroyConnection(sessionId);
    });
  }
}

// Global connection pool
const socketPool = new SocketConnectionPool();

// Custom hook for Socket.io connection with advanced optimization
export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(0);
  
  const reconnectAttemptsRef = useRef(0);
  const heartbeatRef = useRef(null);
  const latencyRef = useRef(null);
  const connectionIdRef = useRef(null);
  const isCleanupRef = useRef(false);

  const connect = useCallback(() => {
    if (!session?.accessToken || isCleanupRef.current) return;

    const sessionId = session.user?.id;
    if (!sessionId) return;

    // Check if we already have a connection for this session
    let existingSocket = socketPool.getConnection(sessionId);
    
    if (existingSocket?.connected) {
      setSocket(existingSocket);
      setConnected(true);
      setConnecting(false);
      setError(null);
      return;
    }

    console.log('🔌 Connecting to Socket.io...');
    setConnecting(true);
    setError(null);

    // Create new connection through pool
    const newSocket = socketPool.createConnection(sessionId, session.accessToken);
    connectionIdRef.current = sessionId;

    // Connection event handlers with performance optimizations
    newSocket.on('connect', () => {
      if (isCleanupRef.current) return;
      
      console.log('✅ Socket.io connected');
      setConnected(true);
      setConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      
      // Send online status
      newSocket.emit('user:online');
      
      // Start latency monitoring
      startLatencyMonitoring(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      if (isCleanupRef.current) return;
      
      console.log('🔌 Socket.io disconnected:', reason);
      setConnected(false);
      setConnecting(false);
      
      // Stop latency monitoring
      stopLatencyMonitoring();
      
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Normal disconnection, will auto-reconnect
        return;
      }
      
      // Handle unexpected disconnections
      setTimeout(() => {
        if (reconnectAttemptsRef.current < 5 && !isCleanupRef.current) {
          reconnectAttemptsRef.current++;
          connect();
        }
      }, Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)); // Exponential backoff
    });

    newSocket.on('connect_error', (error) => {
      if (isCleanupRef.current) return;
      
      console.error('❌ Socket.io connection error:', error);
      setConnected(false);
      setConnecting(false);
      setError(error.message);
      
      reconnectAttemptsRef.current++;
      
      // Show error toast only on repeated failures
      if (reconnectAttemptsRef.current > 2) {
        toast.error('Connection issue', {
          description: 'Real-time features may not work properly',
          duration: 3000
        });
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      if (isCleanupRef.current) return;
      
      console.log(`🔄 Socket.io reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      
      toast.success('Connection restored', {
        description: 'Real-time features are now working',
        duration: 2000
      });
      
      // Restart latency monitoring
      startLatencyMonitoring(newSocket);
    });

    newSocket.on('reconnect_error', (error) => {
      if (isCleanupRef.current) return;
      
      console.error('❌ Socket.io reconnection error:', error);
      
      if (reconnectAttemptsRef.current >= 5) {
        setError('Failed to reconnect');
        toast.error('Connection failed', {
          description: 'Please refresh the page to restore real-time features',
          duration: 5000
        });
      }
    });

    // Latency monitoring for performance
    newSocket.on('pong', (latencyMs) => {
      setLatency(latencyMs);
    });

    // Handle inactivity warnings from server
    newSocket.on('inactivity_warning', (data) => {
      if (isCleanupRef.current) return;
      
      toast.warning('Inactivity detected', {
        description: data.message || 'You will be disconnected due to inactivity',
        duration: data.timeout || 5000,
        action: {
          label: 'Stay connected',
          onClick: () => {
            // Send activity signal to server
            newSocket.emit('user:active');
            toast.dismiss();
          }
        }
      });
    });

    // PWA-specific event listeners
    if (typeof window !== 'undefined') {
      // Listen for visibility changes (PWA backgrounding)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          newSocket.emit('user:away');
        } else {
          newSocket.emit('user:active');
        }
      };
      
      // Listen for online/offline status
      const handleOnline = () => {
        if (!newSocket.connected) {
          connect();
        }
      };
      
      const handleOffline = () => {
        setError('No internet connection');
      };
      
      // Listen for service worker messages (notifications clicked)
      const handleMessage = (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICKED') {
          // Handle notification click navigation
          if (event.data.navigate && window.location.pathname !== event.data.navigate) {
            window.location.href = event.data.navigate;
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      navigator.serviceWorker?.addEventListener('message', handleMessage);
      
      // Store cleanup function
      const cleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        navigator.serviceWorker?.removeEventListener('message', handleMessage);
      };
      
      // Cleanup on disconnect
      newSocket.on('disconnect', cleanup);
      
      // Store cleanup for unmount
      newSocket._pwaCleanup = cleanup;
    }

    setSocket(newSocket);
  }, [session?.accessToken, session?.user?.id]);

  // Latency monitoring functions
  const startLatencyMonitoring = useCallback((socket) => {
    if (latencyRef.current) {
      clearInterval(latencyRef.current);
    }
    
    latencyRef.current = setInterval(() => {
      if (socket?.connected && !isCleanupRef.current) {
        const start = Date.now();
        socket.emit('ping', start);
      }
    }, 30000); // Check every 30 seconds
  }, []);

  const stopLatencyMonitoring = useCallback(() => {
    if (latencyRef.current) {
      clearInterval(latencyRef.current);
      latencyRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    isCleanupRef.current = true;
    
    if (socket) {
      socket.emit('user:away');
      
      // Clean up PWA event listeners
      if (socket._pwaCleanup) {
        socket._pwaCleanup();
      }
      
      // Don't disconnect immediately if using pool
      if (connectionIdRef.current) {
        // Mark as away but keep connection for reuse
        socketPool.getConnection(connectionIdRef.current)?.emit('user:away');
      } else {
        socket.disconnect();
      }
      
      setSocket(null);
      setConnected(false);
      setConnecting(false);
      setError(null);
    }
    
    stopLatencyMonitoring();
  }, [socket, stopLatencyMonitoring]);

  // Initialize connection when session is available
  useEffect(() => {
    if (session?.accessToken && !socket && !isCleanupRef.current) {
      connect();
    }

    return () => {
      // Don't cleanup on session change, only on unmount
    };
  }, [session?.accessToken, socket, connect]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      isCleanupRef.current = true;
      stopLatencyMonitoring();
      
      // Only fully disconnect on unmount, not on session changes
      if (connectionIdRef.current) {
        socketPool.destroyConnection(connectionIdRef.current);
      }
    };
  }, [stopLatencyMonitoring]);

  // Connection health monitoring
  const connectionHealth = useMemo(() => {
    if (!connected) return 'disconnected';
    if (latency > 1000) return 'poor';
    if (latency > 500) return 'fair';
    if (latency > 200) return 'good';
    return 'excellent';
  }, [connected, latency]);

  return {
    socket,
    connected,
    connecting,
    error,
    latency,
    connectionHealth,
    connect,
    disconnect
  };
}

// Hook for job-specific real-time events
export function useJobSocket(jobId) {
  const { socket, connected } = useSocket();
  const [jobUpdates, setJobUpdates] = useState([]);
  const [applications, setApplications] = useState([]);
  const [comments, setComments] = useState([]);

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

    // Listen for comment events
    const handleNewComment = (data) => {
      setComments(prev => [...prev, data.comment]);
      
      toast.info('New comment', {
        description: `${data.author.name} posted a comment`,
        duration: 3000
      });
    };

    const handleNewReply = (data) => {
      setComments(prev => prev.map(comment => 
        comment._id === data.commentId 
          ? { ...comment, replies: [...(comment.replies || []), data.reply] }
          : comment
      ));
      
      toast.info('New reply', {
        description: `${data.author.name} replied to a comment`,
        duration: 3000
      });
    };

    const handleCommentDeleted = (data) => {
      if (data.type === 'comment') {
        setComments(prev => prev.filter(comment => comment._id !== data.commentId));
        toast.info('Comment deleted', { duration: 2000 });
      } else if (data.type === 'reply') {
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { ...comment, replies: comment.replies?.filter(reply => reply._id !== data.replyId) || [] }
            : comment
        ));
        toast.info('Reply deleted', { duration: 2000 });
      }
    };

    const handleLikeToggled = (data) => {
      if (data.type === 'comment') {
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { ...comment, likeCount: data.likeCount }
            : comment
        ));
      } else if (data.type === 'reply') {
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { 
                ...comment, 
                replies: comment.replies?.map(reply => 
                  reply._id === data.replyId 
                    ? { ...reply, likeCount: data.likeCount }
                    : reply
                ) || []
              }
            : comment
        ));
      }
    };

    const handleReactionToggled = (data) => {
      // Similar logic for reactions
      const updateReactions = (item) => {
        const reactionCounts = { ...item.reactionCounts };
        if (data.reacted) {
          reactionCounts[data.reactionType] = (reactionCounts[data.reactionType] || 0) + 1;
        } else {
          reactionCounts[data.reactionType] = Math.max(0, (reactionCounts[data.reactionType] || 1) - 1);
        }
        return { ...item, reactionCounts };
      };

      if (data.type === 'comment') {
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId ? updateReactions(comment) : comment
        ));
      } else if (data.type === 'reply') {
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { 
                ...comment, 
                replies: comment.replies?.map(reply => 
                  reply._id === data.replyId ? updateReactions(reply) : reply
                ) || []
              }
            : comment
        ));
      }
    };

    const handleCommentEdited = (data) => {
      if (data.type === 'comment') {
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { ...comment, message: data.editedContent, edited: { isEdited: true, editedAt: data.timestamp } }
            : comment
        ));
      } else if (data.type === 'reply') {
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { 
                ...comment, 
                replies: comment.replies?.map(reply => 
                  reply._id === data.replyId 
                    ? { ...reply, message: data.editedContent, edited: { isEdited: true, editedAt: data.timestamp } }
                    : reply
                ) || []
              }
            : comment
        ));
      }
      
      toast.info('Content edited', {
        description: `${data.userName} edited their ${data.type}`,
        duration: 2000
      });
    };

    socket.on('job:updated', handleJobUpdate);
    socket.on('application:updated', handleApplicationUpdate);
    socket.on('comment:new', handleNewComment);
    socket.on('comment:reply', handleNewReply);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('comment:like_toggled', handleLikeToggled);
    socket.on('comment:reaction_toggled', handleReactionToggled);
    socket.on('comment:edited', handleCommentEdited);

    return () => {
      socket.emit('leave:job', jobId);
      socket.off('job:updated', handleJobUpdate);
      socket.off('application:updated', handleApplicationUpdate);
      socket.off('comment:new', handleNewComment);
      socket.off('comment:reply', handleNewReply);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('comment:like_toggled', handleLikeToggled);
      socket.off('comment:reaction_toggled', handleReactionToggled);
      socket.off('comment:edited', handleCommentEdited);
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
    comments,
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