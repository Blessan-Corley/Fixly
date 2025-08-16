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

// Mobile Pull to Refresh
export function MobilePullToRefresh({ onRefresh, children, className = '' }) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const startY = useRef(0);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && startY.current) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;
      
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
        setIsPulling(distance > 60);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && onRefresh) {
      onRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
    startY.current = 0;
  };

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullDistance * 0.5}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none'
      }}
    >
      {pullDistance > 0 && (
        <div className="flex justify-center py-2">
          <div className={`transition-transform ${isPulling ? 'rotate-180' : ''}`}>
            <ArrowUp className="h-5 w-5 text-fixly-accent" />
          </div>
        </div>
      )}
      {children}
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

export default {
  MobileHeader,
  MobileBottomNav,
  MobileCard,
  MobileActionSheet,
  MobileSwipeCard,
  MobileContactActions,
  MobileScrollToTop,
  MobilePullToRefresh,
  MobileTimeAgo
};