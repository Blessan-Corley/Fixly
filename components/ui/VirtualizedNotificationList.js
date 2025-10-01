'use client';

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  Briefcase,
  MessageSquare,
  DollarSign,
  Star,
  Shield,
  AlertCircle,
  Clock,
  Check,
  X,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

// Notification type configurations
const NOTIFICATION_CONFIG = {
  job_applied: {
    icon: Briefcase,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    priority: 'medium'
  },
  job_assigned: {
    icon: Check,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    priority: 'high'
  },
  job_completed: {
    icon: Check,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    priority: 'medium'
  },
  job_cancelled: {
    icon: X,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
    priority: 'medium'
  },
  message: {
    icon: MessageSquare,
    color: 'text-fixly-primary bg-fixly-accent/20 dark:bg-fixly-accent/10 dark:text-fixly-primary',
    priority: 'high'
  },
  payment_received: {
    icon: DollarSign,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    priority: 'high'
  },
  payment_pending: {
    icon: Clock,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
    priority: 'medium'
  },
  rating_received: {
    icon: Star,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
    priority: 'low'
  },
  verification_success: {
    icon: Shield,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    priority: 'medium'
  },
  default: {
    icon: Bell,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400',
    priority: 'low'
  }
};

// Memoized notification item component for optimal performance
const NotificationItem = memo(({ index, style, data }) => {
  const { notifications, onNotificationClick, onMarkAsRead, isDesktop } = data;
  const notification = notifications[index];

  // Initialize hooks before any conditional returns
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    if (notification) {
      onNotificationClick(notification);
    }
  }, [notification, onNotificationClick]);

  const handleMarkAsRead = useCallback((e) => {
    e.stopPropagation();
    if (notification) {
      onMarkAsRead(notification._id || notification.id);
    }
  }, [notification, onMarkAsRead]);

  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;

    return date.toLocaleDateString();
  }, []);

  // Dynamic height calculation for different content lengths
  const itemHeight = useMemo(() => {
    const baseHeight = 72;
    const lineHeight = 20;
    const maxLines = 3;

    if (!notification || !notification.message) return baseHeight;

    const estimatedLines = Math.ceil(notification.message.length / 50);
    const actualLines = Math.min(estimatedLines, maxLines);

    return baseHeight + ((actualLines - 1) * lineHeight);
  }, [notification]);

  if (!notification) return null;

  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default;
  const IconComponent = config.icon;

  return (
    <div style={style}>
      <motion.div
        className={`
          relative p-4 border-b border-fixly-border dark:border-gray-700 cursor-pointer
          transition-all duration-200 ease-out
          ${!notification.read 
            ? 'bg-fixly-accent/5 dark:bg-fixly-accent/10 border-l-4 border-l-fixly-accent' 
            : 'hover:bg-fixly-bg/50 dark:hover:bg-gray-800/50'
          }
          ${isPressed ? 'scale-98' : ''}
        `}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        animate={{
          scale: isPressed ? 0.98 : 1,
          backgroundColor: isHovered 
            ? 'rgba(220, 247, 99, 0.05)' 
            : 'transparent'
        }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-start gap-3">
          {/* Notification Icon */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
            ${config.color}
            transition-transform duration-200
            ${isHovered ? 'scale-110' : ''}
          `}>
            <IconComponent className="h-5 w-5" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h4 className={`
                font-medium text-sm leading-tight
                ${!notification.read 
                  ? 'text-fixly-text dark:text-gray-100' 
                  : 'text-fixly-text-muted dark:text-gray-300'
                }
              `}>
                {notification.title}
              </h4>
              
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-fixly-text-muted dark:text-gray-400">
                  {formatTime(notification.createdAt)}
                </span>
                
                {!notification.read && (
                  <div className="w-2 h-2 bg-fixly-accent rounded-full animate-pulse"></div>
                )}
                
                {isDesktop && isHovered && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={handleMarkAsRead}
                    className="p-1 hover:bg-fixly-accent/20 dark:hover:bg-fixly-accent/30 rounded transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3 text-fixly-text-muted" />
                  </motion.button>
                )}
              </div>
            </div>
            
            <p className={`
              text-sm leading-relaxed line-clamp-3
              ${!notification.read 
                ? 'text-fixly-text dark:text-gray-200' 
                : 'text-fixly-text-muted dark:text-gray-400'
              }
            `}>
              {notification.message}
            </p>
            
            {/* Action indicator */}
            {(notification.actionUrl || notification.data?.jobId) && (
              <div className="flex items-center gap-1 mt-2 text-xs text-fixly-accent dark:text-fixly-accent-light">
                <span>View details</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>
        
        {/* Priority indicator */}
        {config.priority === 'high' && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
        )}
      </motion.div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

// Main virtualized notification list component
export default function VirtualizedNotificationList({
  notifications = [],
  onNotificationClick,
  onMarkAsRead,
  onLoadMore,
  hasMore = false,
  loading = false,
  height = 400,
  className = ''
}) {
  const listRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const itemHeights = useRef(new Map());

  // Detect device type and real-time mobile optimization
  useEffect(() => {
    const checkDevice = () => {
      const isDesktopDevice = window.innerWidth >= 768;
      setIsDesktop(isDesktopDevice);
      
      // Real-time mobile optimization
      if (!isDesktopDevice) {
        // Enable touch-friendly optimizations for real-time features
        document.body.classList.add('mobile-realtime-optimized');
      } else {
        document.body.classList.remove('mobile-realtime-optimized');
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => {
      window.removeEventListener('resize', checkDevice);
      document.body.classList.remove('mobile-realtime-optimized');
    };
  }, []);

  // Calculate item height dynamically
  const getItemHeight = useCallback((index) => {
    const notification = notifications[index];
    if (!notification) return 80;
    
    const cached = itemHeights.current.get(index);
    if (cached) return cached;
    
    // Estimate height based on content
    const baseHeight = 72;
    const lineHeight = 20;
    const maxLines = 3;
    
    const messageLength = notification.message?.length || 0;
    const estimatedLines = Math.ceil(messageLength / 60);
    const actualLines = Math.min(estimatedLines, maxLines);
    
    const calculatedHeight = baseHeight + ((actualLines - 1) * lineHeight);
    itemHeights.current.set(index, calculatedHeight);
    
    return calculatedHeight;
  }, [notifications]);

  // Handle scroll to load more
  const handleScroll = useCallback(({ visibleStopIndex }) => {
    if (
      hasMore && 
      !loading && 
      visibleStopIndex >= notifications.length - 5 &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [hasMore, loading, notifications.length, onLoadMore]);

  // Scroll to top when notifications change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start');
    }
  }, [notifications.length]);

  // Memoized item data for performance
  const itemData = useMemo(() => ({
    notifications,
    onNotificationClick,
    onMarkAsRead,
    isDesktop
  }), [notifications, onNotificationClick, onMarkAsRead, isDesktop]);

  if (notifications.length === 0 && !loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="w-16 h-16 bg-fixly-accent/10 dark:bg-fixly-accent/20 rounded-full flex items-center justify-center mb-4">
          <Bell className="h-8 w-8 text-fixly-accent dark:text-fixly-accent-light" />
        </div>
        <h3 className="text-lg font-medium text-fixly-text dark:text-gray-200 mb-2">
          No notifications
        </h3>
        <p className="text-fixly-text-muted dark:text-gray-400 text-center max-w-sm">
          You're all caught up! New notifications will appear here when they arrive.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <List
        ref={listRef}
        height={height}
        itemCount={notifications.length}
        itemSize={getItemHeight}
        itemData={itemData}
        onItemsRendered={handleScroll}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-fixly-accent/20 scrollbar-track-transparent"
      >
        {NotificationItem}
      </List>
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-fixly-card dark:from-gray-800 to-transparent">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-fixly-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-fixly-text-muted dark:text-gray-400">
              Loading more notifications...
            </span>
          </div>
        </div>
      )}
      
      {/* End indicator */}
      {!hasMore && notifications.length > 0 && (
        <div className="p-4 text-center border-t border-fixly-border dark:border-gray-700">
          <span className="text-sm text-fixly-text-muted dark:text-gray-400">
            You've reached the end
          </span>
        </div>
      )}
    </div>
  );
}