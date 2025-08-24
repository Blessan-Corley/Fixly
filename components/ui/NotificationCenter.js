'use client';

import { useState, useRef, useEffect } from 'react';
import { useRealtime } from '../../hooks/useRealtime';
import { Bell, BellRing, X, Check, CheckCheck, Settings } from 'lucide-react';

export default function NotificationCenter({ userId, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const dropdownRef = useRef(null);
  
  const {
    notifications,
    unreadNotifications,
    markNotificationAsRead,
    connected,
    connecting
  } = useRealtime(userId);
  
  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'jobs':
        return ['job_application', 'job_update', 'job_accepted', 'job_rejected', 'job_completed'].includes(notification.type);
      case 'messages':
        return ['message_received', 'comment_added', 'comment_reply'].includes(notification.type);
      default:
        return true;
    }
  });
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job_application':
      case 'job_update':
        return '=¼';
      case 'message_received':
        return '=¬';
      case 'comment_added':
        return '=­';
      case 'payment_received':
        return '=°';
      default:
        return '=';
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };
  
  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    
    if (notification.actions && notification.actions[0]) {
      window.location.href = notification.actions[0].url;
    }
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all ${
          isOpen 
            ? 'bg-blue-50 text-blue-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        {unreadNotifications > 0 ? (
          <BellRing className="w-6 h-6" />
        ) : (
          <Bell className="w-6 h-6" />
        )}
        
        {/* Connection Status */}
        <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${
          connected ? 'bg-green-500' : connecting ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        
        {/* Unread Badge */}
        {unreadNotifications > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </div>
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Notifications</h3>
                <p className="text-sm text-gray-500">
                  {unreadNotifications > 0 
                    ? `${unreadNotifications} unread`
                    : 'All caught up!'
                  }
                </p>
              </div>
              <div className="flex space-x-2">
                {unreadNotifications > 0 && (
                  <button
                    onClick={() => {
                      notifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id));
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex space-x-1 mt-3">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'jobs', label: 'Jobs' },
                { key: 'messages', label: 'Messages' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">=</div>
                <p className="text-gray-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-25' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            
                            {notification.actions && (
                              <div className="flex space-x-2 mt-2">
                                {notification.actions.slice(0, 2).map((action, index) => (
                                  <button
                                    key={index}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = action.url;
                                    }}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNotificationAsRead(notification.id);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {notification.priority >= 3 && (
                          <div className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded mt-2">
                            {notification.priority === 4 ? 'Urgent' : 'High Priority'}
                          </div>
                        )}
                      </div>
                      
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/dashboard/notifications';
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}