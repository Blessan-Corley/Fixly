'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Home, 
  Search, 
  MessageSquare, 
  Bell, 
  User,
  ChevronUp,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from 'lucide-react';
import { useApp } from '../../app/providers';
import { useRealtime } from '../../hooks/useRealtime';

// Enhanced mobile navigation with native app-like behavior
export default function MobileNav({ 
  isOpen, 
  onClose, 
  navigationItems = [],
  className = '' 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useApp();
  const { unreadNotifications: unreadCount } = useRealtime(user?.id);
  const [networkStatus, setNetworkStatus] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [connectionType, setConnectionType] = useState('wifi');
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  // Monitor network and device status
  useEffect(() => {
    const updateNetworkStatus = () => setNetworkStatus(navigator.onLine);
    const updateConnection = () => {
      if (navigator.connection) {
        setConnectionType(navigator.connection.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    updateNetworkStatus();
    updateConnection();

    // Battery API (if supported)
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        const updateBattery = () => setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', updateBattery);
        
        return () => battery.removeEventListener('levelchange', updateBattery);
      });
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const handleNavigation = (href) => {
    router.push(href);
    onClose();
  };

  const getStatusBarInfo = () => {
    const time = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return { time, batteryLevel, networkStatus, connectionType };
  };

  const status = getStatusBarInfo();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Mobile Navigation Panel */}
          <motion.div
            ref={constraintsRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            drag="x"
            dragControls={dragControls}
            dragConstraints={{ left: -300, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(event, info) => {
              if (info.offset.x < -100) {
                onClose();
              }
            }}
            className={`fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col ${className}`}
          >
            {/* Native-like status bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-300">{status.time}</span>
                {!networkStatus && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {networkStatus ? (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                    <Signal className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                  </div>
                ) : (
                  <WifiOff className="w-3 h-3 text-gray-400" />
                )}
                {status.batteryLevel !== null && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                    <Battery className="w-3 h-3" />
                    <span>{status.batteryLevel}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">Fixly</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.name || 'Welcome'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="space-y-1 px-4">
                {navigationItems.map((item, index) => (
                  <motion.button
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      item.current
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {/* Notification badges */}
                      {item.count > 0 && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                          {item.count > 9 ? '9+' : item.count}
                        </div>
                      )}
                      {item.name === 'Notifications' && unreadCount > 0 && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{item.name}</span>
                    {item.highlight && (
                      <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                    {item.badge && (
                      <span className="ml-auto px-2 py-1 bg-orange-500 text-white text-xs rounded-full font-medium">
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => handleNavigation('/dashboard/profile')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {user?.name || 'User Profile'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || 'View profile'}
                  </p>
                </div>
                <ChevronUp className="w-4 h-4 text-gray-400 rotate-90" />
              </button>
            </div>

            {/* Drag indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-300 dark:bg-gray-600 rounded-full opacity-50" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Enhanced mobile bottom navigation bar
export function MobileBottomNav({ 
  navigationItems = [],
  className = '' 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useApp();
  const { unreadNotifications: unreadCount } = useRealtime(user?.id);

  // Filter to show only most important items in bottom nav
  const bottomNavItems = navigationItems.slice(0, 5);

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 md:hidden ${className}`}>
      <div className="grid grid-cols-5 h-16">
        {bottomNavItems.map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              item.current
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {/* Badge for notifications */}
              {item.name === 'Notifications' && unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
              {item.count > 0 && item.name !== 'Notifications' && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {item.count > 9 ? '9+' : item.count}
                </div>
              )}
            </div>
            <span className="text-xs font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Hook for mobile navigation
export function useMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(!isOpen);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}