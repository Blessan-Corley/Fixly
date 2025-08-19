'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSocket, useNotificationSocket, usePresenceSocket } from '../hooks/useSocket';
import { useApp } from '../app/providers';
import { toast } from 'sonner';

const SocketContext = createContext();

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useApp();
  const { socket, connected, connecting, error } = useSocket();
  const { notifications, unreadCount, sendNotification, markAsRead } = useNotificationSocket();
  const { onlineUsers, setUserStatus, isUserOnline } = usePresenceSocket();
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Initialize Socket.io server on mount
  useEffect(() => {
    if (isAuthenticated && connectionAttempts === 0) {
      setConnectionAttempts(1);
      
      // Check Socket.io server status
      fetch('/api/socket/status')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.socketInitialized) {
            console.log('✅ Socket.io server ready');
          } else {
            console.warn('⚠️ Socket.io server not ready');
          }
        })
        .catch(error => {
          console.warn('⚠️ Could not check Socket.io status:', error.message);
          // Don't fail here, Socket.io is initialized on the server
        });
    }
  }, [isAuthenticated, connectionAttempts]);

  // Handle connection status changes
  useEffect(() => {
    if (connected && user) {
      setUserStatus('online');
      console.log('🌐 Real-time features activated');
    }
  }, [connected, user, setUserStatus]);

  // Handle visibility changes (user goes away/comes back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (connected) {
        if (document.hidden) {
          setUserStatus('away');
        } else {
          setUserStatus('online');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connected, setUserStatus]);

  const value = {
    socket,
    connected,
    connecting,
    error,
    notifications,
    unreadCount,
    sendNotification,
    markAsRead,
    onlineUsers,
    setUserStatus,
    isUserOnline
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;