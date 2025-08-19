// components/ui/NotificationCenter.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Clock,
  AlertCircle,
  Star,
  MessageSquare,
  CreditCard,
  Shield,
  User,
  Briefcase,
  Settings,
  Eye,
  EyeOff,
  Filter,
  MoreVertical,
  Trash2,
  RotateCcw,
  Loader,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const NOTIFICATION_ICONS = {
  job_applied: Briefcase,
  job_assigned: User,
  job_completed: Check,
  job_cancelled: X,
  job_disputed: AlertCircle,
  message: MessageSquare,
  payment_received: CreditCard,
  payment_pending: Clock,
  rating_received: Star,
  verification_success: Shield,
  phone_verified: Shield,
  email_verified: Shield,
  subscription_success: CreditCard,
  subscription_cancelled: X,
  privacy_updated: Settings,
  application_sent: Briefcase,
  credits_reset: RotateCcw,
  system: Bell,
  default: Bell
};

const NOTIFICATION_COLORS = {
  job_applied: 'text-blue-600 bg-blue-100',
  job_assigned: 'text-green-600 bg-green-100',
  job_completed: 'text-green-600 bg-green-100',
  job_cancelled: 'text-red-600 bg-red-100',
  job_disputed: 'text-yellow-600 bg-yellow-100',
  message: 'text-purple-600 bg-purple-100',
  payment_received: 'text-green-600 bg-green-100',
  payment_pending: 'text-orange-600 bg-orange-100',
  rating_received: 'text-yellow-600 bg-yellow-100',
  verification_success: 'text-blue-600 bg-blue-100',
  phone_verified: 'text-blue-600 bg-blue-100',
  email_verified: 'text-blue-600 bg-blue-100',
  subscription_success: 'text-green-600 bg-green-100',
  subscription_cancelled: 'text-red-600 bg-red-100',
  privacy_updated: 'text-gray-600 bg-gray-100',
  application_sent: 'text-blue-600 bg-blue-100',
  credits_reset: 'text-green-600 bg-green-100',
  system: 'text-blue-600 bg-blue-100',
  default: 'text-gray-600 bg-gray-100'
};

export default function NotificationCenter({ 
  trigger, 
  className = '',
  showCount = true,
  autoRefresh = true,
  refreshInterval = 60000 // 60 seconds - reduced frequency
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const dropdownRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto refresh notifications - only when open and not connected to real-time
  useEffect(() => {
    if (autoRefresh && isOpen) {
      // Check if we have real-time connection
      const isRealTimeAvailable = window.socket?.connected;
      
      // Only use polling if real-time is not available
      if (!isRealTimeAvailable) {
        refreshIntervalRef.current = setInterval(() => {
          fetchNotifications(1, filter, false);
        }, refreshInterval);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isOpen, filter, refreshInterval]);

  // Initial load and when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1, filter);
    } else {
      // Just get unread count when closed
      fetchUnreadCount();
    }
  }, [isOpen, filter]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/user/notifications?unreadOnly=true&limit=1');
      const data = await response.json();
      
      if (response.ok) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async (pageNum = 1, filterType = 'all', showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20'
      });
      
      if (filterType === 'unread') {
        params.append('unreadOnly', 'true');
      }

      const response = await fetch(`/api/user/notifications?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        if (pageNum === 1) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        
        setUnreadCount(data.unreadCount || 0);
        setHasMore(data.pagination.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/user/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, read: true, readAt: new Date() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingRead(true);
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      } else {
        toast.error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    } finally {
      setMarkingRead(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  // Custom trigger or default bell icon
  const triggerElement = trigger || (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
    >
      {unreadCount > 0 ? (
        <BellRing className="h-6 w-6" />
      ) : (
        <Bell className="h-6 w-6" />
      )}
      
      {showCount && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)}>
        {triggerElement}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={markingRead}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {markingRead ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mark all read'
                    )}
                  </button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 mt-3">
                {['all', 'unread', 'read'].map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filter === filterType
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Loader className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {filter === 'unread' 
                      ? 'No unread notifications'
                      : filter === 'read'
                      ? 'No read notifications'
                      : 'No notifications yet'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => {
                    const IconComponent = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
                    const iconColor = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.default;
                    
                    return (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50/30' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className={`font-medium text-sm ${
                                !notification.read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-xs text-gray-500">
                                  {formatTime(notification.createdAt)}
                                </span>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                            </div>
                            
                            <p className={`text-sm mt-1 ${
                              !notification.read ? 'text-gray-700' : 'text-gray-600'
                            }`}>
                              {notification.message}
                            </p>
                            
                            {notification.actionUrl && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                                <span>View details</span>
                                <ChevronRight className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Load more */}
              {hasMore && (
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={() => fetchNotifications(page + 1, filter)}
                    disabled={loading}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/dashboard/notifications';
                }}
                className="w-full text-sm text-gray-700 hover:text-gray-900 font-medium"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}