'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Filter,
  Search,
  Loader,
  AlertCircle,
  MessageSquare,
  Briefcase,
  DollarSign,
  Star,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  User,
  Award,
  Heart,
  Flag,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { useApp } from '../../providers';
import { toast } from 'sonner';
import { toastMessages } from '../../../utils/toast';

export default function NotificationsPage() {
  const { user } = useApp();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(new Set());
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [filters]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: filters.type !== 'all' ? filters.type : '',
        status: filters.status !== 'all' ? filters.status : '',
        search: filters.search,
        limit: '50'
      });

      const response = await fetch(`/api/user/notifications?${params}`);
      const data = await response.json();

      if (response.ok) {
        setNotifications(data.notifications || []);
      } else {
        toastMessages.error.generic();
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toastMessages.error.network();
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setMarkingAsRead(prev => new Set([...prev, notificationId]));
      
      const response = await fetch(`/api/user/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification._id === notificationId 
              ? { ...notification, read: true, readAt: new Date() }
              : notification
          )
        );
      } else {
        const data = await response.json();
        toast.error('Mark as read failed', {
          description: data.message || 'Please try again'
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toastMessages.error.network();
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/user/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            read: true, 
            readAt: new Date() 
          }))
        );
        toast.success('All notifications marked as read ✅', {
          description: 'Your notification list is now clear'
        });
      } else {
        const data = await response.json();
        toast.error('Mark all as read failed', {
          description: data.message || 'Please try again'
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toastMessages.error.network();
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/user/notifications`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(notification => notification._id !== notificationId)
        );
        toast.success('Notification deleted', {
          description: 'The notification has been removed'
        });
      } else {
        const data = await response.json();
        toast.error('Delete failed', {
          description: data.message || 'Please try again'
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toastMessages.error.network();
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      markAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    } else {
      // Default navigation based on type
      switch (notification.type) {
        case 'job_application':
          router.push('/dashboard/applications');
          break;
        case 'job_status':
          router.push(`/dashboard/jobs/${notification.jobId}`);
          break;
        case 'message':
          router.push('/dashboard/messages');
          break;
        case 'payment':
          router.push('/dashboard/earnings');
          break;
        case 'review':
          router.push('/dashboard/profile');
          break;
        default:
          // Stay on notifications page
          break;
      }
    }
  };

  const getNotificationCategory = (type) => {
    const jobTypes = ['job_applied', 'application_accepted', 'application_rejected', 'job_assigned', 'job_completed', 'job_cancelled', 'progress_confirmed', 'job_confirmed'];
    const messageTypes = ['message_received', 'new_message'];
    const systemTypes = ['payment_received', 'subscription_updated', 'account_verified'];
    
    if (jobTypes.includes(type)) return 'jobs';
    if (messageTypes.includes(type)) return 'messages';
    if (systemTypes.includes(type)) return 'system';
    return 'other';
  };

  const getCategoryStats = () => {
    const stats = {
      all: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      jobs: notifications.filter(n => getNotificationCategory(n.type) === 'jobs').length,
      messages: notifications.filter(n => getNotificationCategory(n.type) === 'messages').length,
      system: notifications.filter(n => getNotificationCategory(n.type) === 'system').length
    };
    return stats;
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    // Filter by active tab
    if (activeTab !== 'all') {
      if (activeTab === 'unread') {
        filtered = filtered.filter(n => !n.read);
      } else {
        filtered = filtered.filter(n => getNotificationCategory(n.type) === activeTab);
      }
    }
    
    // Apply other filters
    if (filters.search) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        n.message.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getNotificationIcon = (type) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case 'job_application': return <Briefcase className={iconClass} />;
      case 'job_status': return <Briefcase className={iconClass} />;
      case 'message': return <MessageSquare className={iconClass} />;
      case 'payment': return <DollarSign className={iconClass} />;
      case 'review': return <Star className={iconClass} />;
      case 'system': return <Settings className={iconClass} />;
      case 'security': return <Shield className={iconClass} />;
      case 'achievement': return <Award className={iconClass} />;
      case 'promotion': return <Zap className={iconClass} />;
      case 'reminder': return <Calendar className={iconClass} />;
      default: return <Info className={iconClass} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'job_application': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'job_status': return 'bg-green-50 text-green-600 border-green-200';
      case 'message': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'payment': return 'bg-green-50 text-green-600 border-green-200';
      case 'review': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'system': return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'security': return 'bg-red-50 text-red-600 border-red-200';
      case 'achievement': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'promotion': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'reminder': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationDate.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="relative">
            <Bell className="h-8 w-8 text-fixly-accent mr-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fixly-text mb-1">
              Notifications
            </h1>
            <p className="text-fixly-text-light">
              {unreadCount > 0 
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'All caught up!'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="btn-ghost flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary flex items-center"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { 
            label: 'Total', 
            value: notifications.length, 
            icon: Bell, 
            color: 'blue' 
          },
          { 
            label: 'Unread', 
            value: unreadCount, 
            icon: BellRing, 
            color: 'red' 
          },
          { 
            label: 'This Week', 
            value: notifications.filter(n => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(n.createdAt) > weekAgo;
            }).length,
            icon: Calendar, 
            color: 'green' 
          },
          { 
            label: 'Important', 
            value: notifications.filter(n => n.priority === 'high').length,
            icon: Flag, 
            color: 'orange' 
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center">
              <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  {stat.value}
                </div>
                <div className="text-sm text-fixly-text-muted">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search notifications..."
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="select-field"
          >
            <option value="all">All Types</option>
            <option value="job_application">Job Applications</option>
            <option value="job_status">Job Updates</option>
            <option value="message">Messages</option>
            <option value="payment">Payments</option>
            <option value="review">Reviews</option>
            <option value="system">System</option>
            <option value="security">Security</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="select-field"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {getFilteredNotifications().length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fixly-text mb-2">
            No notifications
          </h3>
          <p className="text-fixly-text-muted">
            You're all caught up! New notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {getFilteredNotifications().map((notification, index) => (
            <motion.div
              key={notification._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                notification.read 
                  ? 'bg-white border-fixly-border' 
                  : 'bg-blue-50 border-blue-200'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-lg border ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-semibold text-fixly-text truncate">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                      {notification.priority === 'high' && (
                        <Flag className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-sm text-fixly-text-light line-clamp-2 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-fixly-text-muted">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                      
                      {notification.actionText && (
                        <span className="text-xs text-fixly-accent font-medium">
                          {notification.actionText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification._id);
                      }}
                      disabled={markingAsRead.has(notification._id)}
                      className="p-1 text-fixly-text-muted hover:text-fixly-accent transition-colors"
                      title="Mark as read"
                    >
                      {markingAsRead.has(notification._id) ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    className="p-1 text-fixly-text-muted hover:text-red-500 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load More */}
      {notifications.length >= 50 && (
        <div className="text-center mt-8">
          <button className="btn-ghost">
            Load More Notifications
          </button>
        </div>
      )}
    </div>
  );
}