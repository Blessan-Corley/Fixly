'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function SilentLoader({ 
  isLoading = false, 
  text = 'Updating...', 
  position = 'top-right',
  type = 'refresh' // 'refresh', 'sync', 'network'
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Small delay to prevent flashing for very quick operations
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isLoading]);

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-40',
    'top-left': 'fixed top-4 left-4 z-40', 
    'bottom-right': 'fixed bottom-4 right-4 z-40',
    'bottom-left': 'fixed bottom-4 left-4 z-40',
    'center': 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40'
  };

  const getIcon = () => {
    switch (type) {
      case 'sync':
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      case 'network':
        return <Wifi className="h-3 w-3 animate-pulse" />;
      default:
        return <RefreshCw className="h-3 w-3 animate-spin" />;
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          className={positionClasses[position]}
        >
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="text-blue-600">
                {getIcon()}
              </div>
              <span className="text-xs text-gray-600 font-medium">
                {text}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function NetworkStatus({ isOnline = true, isConnecting = false }) {
  return (
    <AnimatePresence>
      {(!isOnline || isConnecting) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div className={`w-full px-4 py-2 text-center text-sm font-medium ${
            isConnecting 
              ? 'bg-yellow-500 text-yellow-900' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center justify-center gap-2">
              {isConnecting ? (
                <>
                  <Wifi className="h-4 w-4 animate-pulse" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  Connection lost
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BackgroundActivity({ 
  activities = [], // Array of activity objects: [{ id, text, type }]
  maxVisible = 1 
}) {
  const [visibleActivities, setVisibleActivities] = useState([]);

  useEffect(() => {
    const activeActivities = activities.slice(0, maxVisible);
    setVisibleActivities(activeActivities);
  }, [activities, maxVisible]);

  if (visibleActivities.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 space-y-2">
      <AnimatePresence>
        {visibleActivities.map((activity) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="bg-gray-800/80 backdrop-blur-sm text-white rounded-lg px-3 py-2 shadow-lg border border-gray-700/50"
          >
            <div className="flex items-center gap-2">
              <div className="text-blue-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
              </div>
              <span className="text-xs font-medium">
                {activity.text}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}