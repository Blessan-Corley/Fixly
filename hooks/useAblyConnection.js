'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getClientAbly } from '@/lib/ably';

export function useAblyConnection() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const ablyRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Enhanced connection management
  const connect = useCallback(() => {
    if (ablyRef.current) return ablyRef.current;

    try {
      const ably = getClientAbly();
      if (!ably) {
        setConnectionStatus('disabled');
        return null;
      }

      ablyRef.current = ably;

      // Connection event handlers
      ably.connection.on('connected', () => {
        console.log('🟢 Ably connected');
        setConnectionStatus('connected');
        setConnectionAttempts(0);
        setIsReconnecting(false);
      });

      ably.connection.on('connecting', () => {
        console.log('🔄 Ably connecting...');
        setConnectionStatus('connecting');
      });

      ably.connection.on('disconnected', () => {
        console.log('🔴 Ably disconnected');
        setConnectionStatus('disconnected');
        attemptReconnect();
      });

      ably.connection.on('suspended', () => {
        console.log('🟡 Ably connection suspended');
        setConnectionStatus('suspended');
        attemptReconnect();
      });

      ably.connection.on('failed', (error) => {
        console.error('❌ Ably connection failed:', error);
        setConnectionStatus('failed');
        attemptReconnect();
      });

      ably.connection.on('update', (stateChange) => {
        console.log(`🔄 Ably state change: ${stateChange.previous} → ${stateChange.current}`);
      });

      return ably;
    } catch (error) {
      console.error('❌ Failed to initialize Ably connection:', error);
      setConnectionStatus('failed');
      return null;
    }
  }, []);

  // Smart reconnection logic with better limits
  const attemptReconnect = useCallback(() => {
    if (isReconnecting || connectionStatus === 'connected' || connectionStatus === 'disabled') {
      return;
    }

    // Limit max reconnection attempts
    if (connectionAttempts >= 5) {
      console.log('⚠️ Max reconnection attempts reached. Stopping reconnection.');
      setConnectionStatus('failed');
      return;
    }

    setIsReconnecting(true);
    setConnectionAttempts(prev => prev + 1);

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Exponential backoff with jitter but cap at 10 seconds
    const baseDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = baseDelay + jitter;

    console.log(`🔄 Attempting to reconnect in ${Math.round(delay)}ms (attempt ${connectionAttempts + 1}/5)`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (ablyRef.current && ablyRef.current.connection.state !== 'connected') {
        try {
          ablyRef.current.connect();
        } catch (error) {
          console.error('❌ Reconnection attempt failed:', error);
          setIsReconnecting(false);

          // Retry if we haven't exceeded max attempts
          if (connectionAttempts < 4) {
            setTimeout(attemptReconnect, 2000);
          } else {
            setConnectionStatus('failed');
          }
        }
      } else {
        setIsReconnecting(false);
      }
    }, delay);
  }, [connectionAttempts, isReconnecting, connectionStatus]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (ablyRef.current) {
      try {
        ablyRef.current.connect();
      } catch (error) {
        console.error('❌ Manual reconnect failed:', error);
      }
    } else {
      connect();
    }
  }, [connect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (ablyRef.current) {
      try {
        ablyRef.current.close();
        ablyRef.current = null;
        setConnectionStatus('disconnected');
        setIsReconnecting(false);
      } catch (error) {
        console.error('❌ Error disconnecting Ably:', error);
      }
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    const ably = connect();

    // Cleanup function to prevent memory leaks
    return () => {
      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Remove all event listeners before disconnecting
      if (ablyRef.current) {
        try {
          ablyRef.current.connection.off();
          ablyRef.current.close();
          ablyRef.current = null;
        } catch (error) {
          console.error('❌ Error during cleanup:', error);
        }
      }

      setConnectionStatus('disconnected');
      setIsReconnecting(false);
      setConnectionAttempts(0);
    };
  }, []); // Remove dependencies to prevent reconnection loops

  // Health check
  const healthCheck = useCallback(() => {
    if (!ablyRef.current) return false;

    const state = ablyRef.current.connection.state;
    const isHealthy = ['connected', 'connecting'].includes(state);

    if (!isHealthy && !isReconnecting) {
      console.log(`🩺 Health check failed. Connection state: ${state}`);
      attemptReconnect();
    }

    return isHealthy;
  }, [isReconnecting, attemptReconnect]);

  // Periodic health check with proper cleanup
  useEffect(() => {
    let healthCheckInterval;

    if (connectionStatus === 'connected') {
      healthCheckInterval = setInterval(healthCheck, 30000); // Every 30 seconds
    }

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [connectionStatus, healthCheck]);

  return {
    ably: ablyRef.current,
    connectionStatus,
    connectionAttempts,
    isReconnecting,
    connect,
    disconnect,
    reconnect,
    healthCheck,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: ['disconnected', 'suspended', 'failed'].includes(connectionStatus),
    isDisabled: connectionStatus === 'disabled'
  };
}