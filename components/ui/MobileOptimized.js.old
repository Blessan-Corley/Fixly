'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ArrowUp,
  Phone,
  Mail,
  MapPin,
  Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mobile Navigation Header
export function MobileHeader({ 
  title, 
  showBack = false, 
  showSearch = false, 
  showFilter = false,
  onBack,
  onSearch,
  onFilter,
  rightAction,
  className = ''
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className={`bg-fixly-bg dark:bg-gray-900 border-b border-fixly-border dark:border-gray-700 sticky top-0 z-40 ${className}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-fixly-accent/10 rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-fixly-text dark:text-gray-200" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-fixly-text dark:text-gray-100 truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {showSearch && (
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                onSearch?.();
              }}
              className="p-2 hover:bg-fixly-accent/10 rounded-full transition-colors"
            >
              <Search className="h-5 w-5 text-fixly-text dark:text-gray-200" />
            </button>
          )}
          
          {showFilter && (
            <button
              onClick={onFilter}
              className="p-2 hover:bg-fixly-accent/10 rounded-full transition-colors"
            >
              <Filter className="h-5 w-5 text-fixly-text dark:text-gray-200" />
            </button>
          )}
          
          {rightAction}
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-fixly-border dark:border-gray-700"
          >
            <div className="p-4">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile Bottom Navigation
export function MobileBottomNav({ activeTab, tabs, className = '' }) {
  return (
    <div className={`bg-fixly-bg dark:bg-gray-900 border-t border-fixly-border dark:border-gray-700 fixed bottom-0 left-0 right-0 z-40 safe-area-pb ${className}`}>
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={tab.onClick}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'text-fixly-accent'
                : 'text-fixly-text-muted dark:text-gray-400 hover:text-fixly-text dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{tab.label}</span>
            {tab.badge && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Mobile Card Component
export function MobileCard({ 
  children, 
  onClick, 
  className = '',
  padding = 'default',
  hover = true
}) {
  const paddingClasses = {
    none: '',
    small: 'p-3',
    default: 'p-4',
    large: 'p-6'
  };

  return (
    <div 
      className={`
        bg-fixly-card dark:bg-gray-800 
        border border-fixly-border dark:border-gray-700 
        rounded-xl 
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${hover ? 'hover:shadow-md dark:hover:shadow-lg transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Mobile Action Sheet
export function MobileActionSheet({ 
  isOpen, 
  onClose, 
  title, 
  actions = [],
  className = ''
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`w-full bg-fixly-bg dark:bg-gray-900 rounded-t-xl shadow-xl ${className}`}
          >
            {title && (
              <div className="p-4 border-b border-fixly-border dark:border-gray-700">
                <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 text-center">
                  {title}
                </h3>
              </div>
            )}
            
            <div className="p-4 space-y-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={`
                    w-full flex items-center space-x-3 p-4 rounded-lg transition-colors
                    ${action.variant === 'danger' 
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                      : 'text-fixly-text dark:text-gray-200 hover:bg-fixly-accent/10'
                    }
                  `}
                >
                  {action.icon && <action.icon className="h-5 w-5" />}
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full p-4 text-center text-fixly-text-muted dark:text-gray-400 border-t border-fixly-border dark:border-gray-700"
            >
              Cancel
            </button>
            
            {/* Safe area padding for iPhone */}
            <div className="safe-area-pb" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Mobile Swipeable Card
export function MobileSwipeCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  className = '' 
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    setDragX(0);

    const threshold = 100;
    if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDrag={(event, info) => setDragX(info.offset.x)}
      onDragEnd={handleDragEnd}
      className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      style={{
        x: dragX,
        opacity: isDragging ? 0.8 : 1
      }}
    >
      {children}
    </motion.div>
  );
}

// Mobile Contact Actions
export function MobileContactActions({ phone, email, address, className = '' }) {
  const actions = [
    phone && {
      icon: Phone,
      label: 'Call',
      href: `tel:${phone}`,
      color: 'text-green-600'
    },
    email && {
      icon: Mail,
      label: 'Email',
      href: `mailto:${email}`,
      color: 'text-blue-600'
    },
    address && {
      icon: MapPin,
      label: 'Directions',
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      color: 'text-red-600'
    }
  ].filter(Boolean);

  return (
    <div className={`flex space-x-4 ${className}`}>
      {actions.map((action, index) => (
        <a
          key={index}
          href={action.href}
          target={action.href.startsWith('http') ? '_blank' : undefined}
          rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className={`
            flex flex-col items-center space-y-1 p-3 rounded-lg 
            bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-700
            hover:bg-fixly-accent/10 transition-colors
            ${action.color}
          `}
        >
          <action.icon className="h-5 w-5" />
          <span className="text-xs font-medium">{action.label}</span>
        </a>
      ))}
    </div>
  );
}

// Mobile Scroll to Top
export function MobileScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-30 p-3 bg-fixly-accent text-white rounded-full shadow-lg hover:bg-fixly-accent-dark transition-colors"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Enhanced Mobile Pull to Refresh with Visual Feedback
export function MobilePullToRefresh({ onRefresh, children, className = '', disabled = false }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const maxPullDistance = 80;
  const triggerDistance = 60;

  const handleTouchStart = (e) => {
    if (disabled || window.scrollY > 0) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || disabled || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    const limitedDistance = Math.min(distance * 0.5, maxPullDistance);
    
    setPullDistance(limitedDistance);
    
    // Prevent default scrolling only when pulling down
    if (distance > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging || disabled) return;
    
    setIsDragging(false);
    
    if (pullDistance >= triggerDistance) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center pt-4"
            style={{ transform: `translateX(-50%) translateY(${pullDistance}px)` }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-3 border border-gray-200 dark:border-gray-700">
              {isRefreshing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full"
                />
              ) : (
                <motion.div
                  animate={{ rotate: pullDistance >= triggerDistance ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowUp className="w-5 h-5 text-teal-500" />
                </motion.div>
              )}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {isRefreshing ? 'Refreshing...' : pullDistance >= triggerDistance ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content with dynamic transform */}
      <motion.div
        animate={{ y: isRefreshing ? 60 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ transform: `translateY(${Math.min(pullDistance, maxPullDistance)}px)` }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Mobile-optimized time display
export function MobileTimeAgo({ date, className = '' }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
      
      if (diffInSeconds < 60) {
        setTimeAgo('now');
      } else if (diffInSeconds < 3600) {
        setTimeAgo(`${Math.floor(diffInSeconds / 60)}m`);
      } else if (diffInSeconds < 86400) {
        setTimeAgo(`${Math.floor(diffInSeconds / 3600)}h`);
      } else if (diffInSeconds < 604800) {
        setTimeAgo(`${Math.floor(diffInSeconds / 86400)}d`);
      } else {
        setTimeAgo(new Date(date).toLocaleDateString());
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className={`text-xs text-fixly-text-muted dark:text-gray-400 ${className}`}>
      {timeAgo}
    </span>
  );
}

// Advanced Mobile Device Detection Hook
export function useMobileDevice() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    hasTouch: false,
    orientation: 'portrait',
    screenSize: 'small',
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /mobi|android/i.test(userAgent);
      const isTablet = /tablet|ipad/i.test(userAgent) || (isMobile && window.innerWidth > 768);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      const screenSize = window.innerWidth < 640 ? 'small' : 
                         window.innerWidth < 1024 ? 'medium' : 'large';

      // Detect safe area insets for iOS devices
      const safeAreaInsets = {
        top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0')
      };

      setDeviceInfo({
        isMobile: isMobile && !isTablet,
        isTablet,
        isDesktop: !isMobile && !isTablet,
        isIOS,
        isAndroid,
        hasTouch,
        orientation,
        screenSize,
        safeAreaInsets
      });
    };

    updateDeviceInfo();
    
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
    
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

// Enhanced Mobile Touch Gestures Hook
export function useTouchGestures({ 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  onTap,
  onDoubleTap,
  onLongPress,
  threshold = 50,
  timeout = 300 
}) {
  const touchRef = useRef(null);
  const [touchState, setTouchState] = useState({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTap: 0
  });

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      lastTap: touchState.lastTap
    });

    // Long press detection
    if (onLongPress) {
      setTimeout(() => {
        if (touchState.startTime === now) {
          onLongPress(e);
        }
      }, 500);
    }
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const now = Date.now();
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const deltaTime = now - touchState.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Tap detection
    if (distance < 10 && deltaTime < timeout) {
      // Double tap detection
      if (onDoubleTap && now - touchState.lastTap < 300) {
        onDoubleTap(e);
        setTouchState(prev => ({ ...prev, lastTap: 0 }));
        return;
      }
      
      if (onTap) {
        onTap(e);
      }
      
      setTouchState(prev => ({ ...prev, lastTap: now }));
      return;
    }

    // Swipe detection
    if (distance > threshold && deltaTime < timeout) {
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      
      if (isHorizontal) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight(e);
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft(e);
        }
      } else {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown(e);
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp(e);
        }
      }
    }
  };

  return {
    touchRef,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    touchState
  };
}

// Mobile-optimized Virtual List for Performance
export function MobileVirtualList({ 
  items, 
  renderItem, 
  itemHeight = 80, 
  className = '',
  onEndReached,
  endReachedThreshold = 200
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const start = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(start + visibleCount + 2, items.length); // Buffer of 2 items
      
      setScrollTop(scrollTop);
      setVisibleRange({ start: Math.max(0, start - 1), end });
      
      // End reached detection
      if (onEndReached && container.scrollHeight - scrollTop - containerHeight < endReachedThreshold) {
        onEndReached();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length, itemHeight, onEndReached, endReachedThreshold]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: '100%' }}
    >
      <div 
        ref={listRef}
        style={{ 
          height: totalHeight,
          position: 'relative'
        }}
      >
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div 
              key={visibleRange.start + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mobile Haptic Feedback Hook
export function useHapticFeedback() {
  const vibrate = (pattern = [10]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback not supported:', error);
      }
    }
  };

  const feedback = {
    light: () => vibrate([10]),
    medium: () => vibrate([20]),
    heavy: () => vibrate([30]),
    success: () => vibrate([10, 50, 10]),
    error: () => vibrate([50, 50, 50]),
    warning: () => vibrate([30, 30])
  };

  return feedback;
}

// Enhanced Mobile Safe Area Component
export function MobileSafeArea({ children, className = '', edges = ['top', 'bottom', 'left', 'right'] }) {
  const safeAreaClasses = {
    top: 'pt-safe-area-top',
    bottom: 'pb-safe-area-bottom', 
    left: 'pl-safe-area-left',
    right: 'pr-safe-area-right'
  };

  const appliedClasses = edges.map(edge => safeAreaClasses[edge]).join(' ');

  return (
    <div className={`${appliedClasses} ${className}`}>
      {children}
    </div>
  );
}

export default {
  MobileHeader,
  MobileBottomNav,
  MobileCard,
  MobileActionSheet,
  MobileSwipeCard,
  MobileContactActions,
  MobileScrollToTop,
  MobilePullToRefresh,
  MobileTimeAgo,
  MobileVirtualList,
  MobileSafeArea,
  useMobileDevice,
  useTouchGestures,
  useHapticFeedback
};