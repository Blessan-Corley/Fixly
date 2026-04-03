'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { closeAblyClient, getClientAbly } from '@/lib/ably';

type TimeoutHandle = ReturnType<typeof setTimeout>;

type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'suspended'
  | 'failed'
  | 'disabled';

type AblyClient = NonNullable<ReturnType<typeof getClientAbly>>;

type UseAblyConnectionResult = {
  ably: AblyClient | null;
  connectionStatus: ConnectionStatus;
  connectionAttempts: number;
  isReconnecting: boolean;
  connect: () => AblyClient | null;
  disconnect: () => void;
  reconnect: () => void;
  healthCheck: () => boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  isDisabled: boolean;
};

const MAX_RECONNECT_ATTEMPTS = 5;

export function useAblyConnection(): UseAblyConnectionResult {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const ablyRef = useRef<AblyClient | null>(null);
  const reconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const connectionAttemptsRef = useRef(0);
  const connectionStatusRef = useRef<ConnectionStatus>('disconnected');
  const isReconnectingRef = useRef(false);

  useEffect(() => {
    connectionAttemptsRef.current = connectionAttempts;
  }, [connectionAttempts]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    isReconnectingRef.current = isReconnecting;
  }, [isReconnecting]);

  const attemptReconnect = useCallback(() => {
    if (
      isReconnectingRef.current ||
      connectionStatusRef.current === 'connected' ||
      connectionStatusRef.current === 'disabled'
    ) {
      return;
    }

    if (connectionAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('failed');
      return;
    }

    setIsReconnecting(true);
    setConnectionAttempts((prev) => prev + 1);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const currentAttempt = connectionAttemptsRef.current;
    const baseDelay = Math.min(1000 * Math.pow(2, currentAttempt), 10000);
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = baseDelay + jitter;

    reconnectTimeoutRef.current = setTimeout(() => {
      const client = ablyRef.current;
      if (!client) {
        setIsReconnecting(false);
        return;
      }

      if (client.connection.state === 'connected') {
        setIsReconnecting(false);
        return;
      }

      try {
        client.connect();
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        setIsReconnecting(false);

        if (connectionAttemptsRef.current < MAX_RECONNECT_ATTEMPTS - 1) {
          setTimeout(attemptReconnect, 2000);
        } else {
          setConnectionStatus('failed');
        }
      }
    }, delay);
  }, []);

  const connect = useCallback((): AblyClient | null => {
    if (ablyRef.current) {
      return ablyRef.current;
    }

    try {
      const client = getClientAbly();
      if (!client) {
        setConnectionStatus('disabled');
        return null;
      }

      ablyRef.current = client;

      client.connection.on('connected', () => {
        setConnectionStatus('connected');
        setConnectionAttempts(0);
        setIsReconnecting(false);
      });

      client.connection.on('connecting', () => {
        setConnectionStatus('connecting');
      });

      client.connection.on('disconnected', () => {
        setConnectionStatus('disconnected');
        attemptReconnect();
      });

      client.connection.on('suspended', () => {
        setConnectionStatus('suspended');
        attemptReconnect();
      });

      client.connection.on('failed', (error: unknown) => {
        console.error('Ably connection failed:', error);
        setConnectionStatus('failed');
        attemptReconnect();
      });

      return client;
    } catch (error) {
      console.error('Failed to initialize Ably connection:', error);
      setConnectionStatus('failed');
      return null;
    }
  }, [attemptReconnect]);

  const reconnect = useCallback(() => {
    if (ablyRef.current) {
      try {
        ablyRef.current.connect();
      } catch (error) {
        console.error('Manual reconnect failed:', error);
      }
      return;
    }

    connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (!ablyRef.current) {
      return;
    }

    try {
      closeAblyClient();
      ablyRef.current = null;
      setConnectionStatus('disconnected');
      setIsReconnecting(false);
    } catch (error) {
      console.error('Error disconnecting Ably:', error);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (!ablyRef.current) {
        return;
      }

      try {
        ablyRef.current.connection.off();
        ablyRef.current = null;
      } catch (error) {
        console.error('Error during Ably cleanup:', error);
      }

      setConnectionStatus('disconnected');
      setIsReconnecting(false);
      setConnectionAttempts(0);
    };
  }, [connect]);

  const healthCheck = useCallback(() => {
    if (!ablyRef.current) {
      return false;
    }

    const state = ablyRef.current.connection.state;
    const isHealthy = state === 'connected' || state === 'connecting';

    if (!isHealthy && !isReconnectingRef.current) {
      attemptReconnect();
    }

    return isHealthy;
  }, [attemptReconnect]);

  useEffect(() => {
    let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    if (connectionStatus === 'connected') {
      healthCheckInterval = setInterval(healthCheck, 30000);
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
    isDisconnected:
      connectionStatus === 'disconnected' ||
      connectionStatus === 'suspended' ||
      connectionStatus === 'failed',
    isDisabled: connectionStatus === 'disabled',
  };
}
