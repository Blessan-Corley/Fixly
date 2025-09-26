'use client';

import { motion } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Loader,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity
} from 'lucide-react';
import { useAblyConnection } from '@/hooks/useAblyConnection';

export function ConnectionStatus({ showDetails = false, className = "" }) {
  const {
    connectionStatus,
    connectionAttempts,
    isReconnecting,
    reconnect,
    healthCheck
  } = useAblyConnection();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          label: 'Connected',
          description: 'Real-time features active'
        };
      case 'connecting':
        return {
          icon: Loader,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          label: 'Connecting',
          description: 'Establishing connection...',
          animate: true
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Disconnected',
          description: 'Real-time features offline'
        };
      case 'suspended':
        return {
          icon: AlertTriangle,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          label: 'Suspended',
          description: 'Connection temporarily suspended'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Failed',
          description: 'Connection failed'
        };
      case 'disabled':
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          label: 'Disabled',
          description: 'Real-time features disabled'
        };
      default:
        return {
          icon: Wifi,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          label: 'Unknown',
          description: 'Connection status unknown'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`relative ${config.bgColor} ${config.borderColor} border rounded-full p-1.5`}>
          <StatusIcon
            className={`h-3 w-3 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
          />
          {connectionStatus === 'connected' && (
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          )}
        </div>
        {showDetails && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  // Detailed status card
  return (
    <motion.div
      className={`card p-4 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`relative ${config.bgColor} ${config.borderColor} border rounded-lg p-2`}>
            <StatusIcon
              className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
            />
            {connectionStatus === 'connected' && (
              <div className="absolute inset-0 rounded-lg bg-green-500/10 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${config.color}`}>
              {config.label}
            </h3>
            <p className="text-sm text-fixly-text-muted">
              {config.description}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(connectionStatus === 'disconnected' || connectionStatus === 'failed') && (
            <button
              onClick={reconnect}
              disabled={isReconnecting}
              className="btn-sm btn-secondary flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
          )}

          <button
            onClick={healthCheck}
            className="btn-sm btn-ghost"
            title="Check connection health"
          >
            <Activity className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Connection details */}
      {(isReconnecting || connectionAttempts > 0) && (
        <motion.div
          className="border-t border-fixly-border pt-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="flex items-center justify-between text-xs text-fixly-text-muted">
            {isReconnecting && (
              <span className="flex items-center gap-1">
                <Loader className="h-3 w-3 animate-spin" />
                Reconnecting...
              </span>
            )}
            {connectionAttempts > 0 && (
              <span>
                Attempts: {connectionAttempts}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Status indicators */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-fixly-border">
        <div className="flex items-center gap-1 text-xs text-fixly-text-muted">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-green-500 animate-pulse'
              : 'bg-gray-400'
          }`} />
          Real-time
        </div>
        <div className="flex items-center gap-1 text-xs text-fixly-text-muted">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-blue-500 animate-pulse'
              : 'bg-gray-400'
          }`} />
          Notifications
        </div>
        <div className="flex items-center gap-1 text-xs text-fixly-text-muted">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-purple-500 animate-pulse'
              : 'bg-gray-400'
          }`} />
          Live Updates
        </div>
      </div>
    </motion.div>
  );
}

// Compact connection indicator for header/nav
export function ConnectionIndicator({ className = "" }) {
  return <ConnectionStatus showDetails={false} className={className} />;
}

// Full connection status card
export function ConnectionStatusCard({ className = "" }) {
  return <ConnectionStatus showDetails={true} className={className} />;
}