// app/dashboard/layout.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  Briefcase,
  Search,
  Users,
  DollarSign,
  Bell,
  BellRing,
  Settings,
  User,
  LogOut,
  Plus,
  MessageSquare,
  Star,
  Award,
  Activity,
  Shield,
  HelpCircle,
  ChevronDown,
  Wrench
} from 'lucide-react';
import { useApp, ProtectedRoute } from '../providers';
import { useNotifications } from '../../contexts/NotificationContext';
import { toast } from 'sonner';
import { toastMessages } from '../../utils/toast';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <DashboardContent>{children}</DashboardContent>
    </ProtectedRoute>
  );
}

function DashboardContent({ children }) {
  const { user } = useApp();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    handleNotificationClick,
    isRealTimeConnected 
  } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({});
  const [badgeStyle, setBadgeStyle] = useState('numbers'); // Load from cookies

  // Load badge style preference from cookies
  useEffect(() => {
    const savedBadgeStyle = document.cookie
      .split('; ')
      .find(row => row.startsWith('badgeStyle='))
      ?.split('=')[1] || 'numbers';
    setBadgeStyle(savedBadgeStyle);
  }, []);

  // Fetch notification counts for badges
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        const unreadNotifications = notifications.filter(n => !n.read);
        
        const counts = {
          messages: unreadNotifications.filter(n => n.type === 'new_message').length,
          applications: unreadNotifications.filter(n => 
            n.type === 'job_applied' || n.type === 'application_accepted' || n.type === 'application_rejected'
          ).length,
          jobs: unreadNotifications.filter(n => 
            n.type === 'job_question' || n.type === 'comment_reply'
          ).length
        };
        
        setNotificationCounts(counts);
      } catch (error) {
        console.error('Error fetching notification counts:', error);
      }
    };

    if (notifications.length > 0) {
      fetchNotificationCounts();
    }
  }, [notifications]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
      if (!event.target.closest('.notification-dropdown')) {
        setNotificationDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
      toastMessages.error.generic();
    }
  };

  const getNavigationItems = () => {
    const commonItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        current: pathname === '/dashboard'
      },
      {
        name: 'Messages',
        href: '/dashboard/messages',
        icon: MessageSquare,
        current: pathname.startsWith('/dashboard/messages'),
        count: notificationCounts.messages || 0
      },
      {
        name: 'Profile',
        href: '/dashboard/profile',
        icon: User,
        current: pathname.startsWith('/dashboard/profile')
      }
    ];

    if (user?.role === 'hirer') {
      return [
        ...commonItems.slice(0, 1), // Dashboard
        {
          name: 'Post Job',
          href: '/dashboard/post-job',
          icon: Plus,
          current: pathname === '/dashboard/post-job',
          highlight: true
        },
        {
          name: 'My Jobs',
          href: '/dashboard/jobs',
          icon: Briefcase,
          current: pathname.startsWith('/dashboard/jobs'),
          count: notificationCounts.jobs || 0
        },
        {
          name: 'Find Fixers',
          href: '/dashboard/find-fixers',
          icon: Search,
          current: pathname.startsWith('/dashboard/find-fixers')
        },
        ...commonItems.slice(1) // Messages, Profile
      ];
    }

    if (user?.role === 'fixer') {
      return [
        ...commonItems.slice(0, 1), // Dashboard
        {
          name: 'Browse Jobs',
          href: '/dashboard/browse-jobs',
          icon: Search,
          current: pathname.startsWith('/dashboard/browse-jobs'),
          highlight: true
        },
        {
          name: 'My Applications',
          href: '/dashboard/applications',
          icon: Briefcase,
          current: pathname.startsWith('/dashboard/applications'),
          count: notificationCounts.applications || 0
        },
        {
          name: 'Earnings',
          href: '/dashboard/earnings',
          icon: DollarSign,
          current: pathname.startsWith('/dashboard/earnings')
        },
        {
          name: 'Subscription',
          href: '/dashboard/subscription',
          icon: Award,
          current: pathname.startsWith('/dashboard/subscription'),
          badge: user?.plan?.type === 'free' ? 'Upgrade' : null
        },
        ...commonItems.slice(1) // Messages, Profile
      ];
    }

    if (user?.role === 'admin') {
      return [
        ...commonItems.slice(0, 1), // Dashboard
        {
          name: 'Users',
          href: '/dashboard/admin/users',
          icon: Users,
          current: pathname.startsWith('/dashboard/admin/users')
        },
        {
          name: 'Jobs',
          href: '/dashboard/admin/jobs',
          icon: Briefcase,
          current: pathname.startsWith('/dashboard/admin/jobs')
        },
        {
          name: 'Analytics',
          href: '/dashboard/admin/analytics',
          icon: Activity,
          current: pathname.startsWith('/dashboard/admin/analytics')
        },
        {
          name: 'Reports',
          href: '/dashboard/admin/reports',
          icon: Shield,
          current: pathname.startsWith('/dashboard/admin/reports')
        },
        ...commonItems.slice(1) // Messages, Profile
      ];
    }

    return commonItems;
  };

  const navigationItems = getNavigationItems();
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`sidebar fixed top-0 left-0 z-50 w-64 h-full transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-fixly-border">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-fixly-accent mr-2" />
              <span className="text-xl font-bold text-fixly-text">Fixly</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-fixly-accent/10 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-fixly-border">
            <div className="flex items-center">
              <img
                src={user?.photoURL || '/default-avatar.png'}
                alt={user?.name}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-fixly-text truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-fixly-text-muted truncate">
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </p>
              </div>
            </div>
            
            {/* Plan badge for fixers */}
            {user?.role === 'fixer' && (
              <div className="mt-3">
                <div className={`text-xs px-2 py-1 rounded-full ${
                  user?.plan?.type === 'pro' 
                    ? 'bg-fixly-accent text-fixly-text' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {user?.plan?.type === 'pro' ? '⭐ Pro Member' : `${Math.max(0, 3 - (parseInt(user?.plan?.creditsUsed) || 0))} free credits left`}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={`sidebar-item w-full ${
                  item.current ? 'sidebar-item-active' : ''
                } ${item.highlight ? 'ring-2 ring-fixly-accent' : ''}`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">{item.name}</span>
                {item.count && item.count > 0 && (
                  badgeStyle === 'dots' ? (
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  ) : (
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full min-w-[20px] text-center">
                      {item.count > 9 ? '9+' : item.count}
                    </span>
                  )
                )}
                {item.badge && (
                  <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Settings & Help */}
          <div className="p-4 border-t border-fixly-border space-y-2">
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="sidebar-item w-full"
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </button>
            <button
              onClick={() => router.push('/help')}
              className="sidebar-item w-full"
            >
              <HelpCircle className="h-5 w-5 mr-3" />
              Help & Support
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="navbar px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-fixly-accent/10 rounded"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-fixly-text">
                {navigationItems.find(item => item.current)?.name || 'Dashboard'}
              </h1>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle variant="dropdown" />
              
              {/* Notifications */}
              <div className="relative notification-dropdown">
                <button
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className="relative p-2 hover:bg-fixly-accent/10 rounded-lg transition-all duration-200 group"
                  title={`${unreadCount} unread notifications${isRealTimeConnected ? ' (Real-time)' : ''}`}
                >
                  <div className="relative">
                    {unreadCount > 0 ? (
                      <BellRing className="h-5 w-5 text-fixly-text group-hover:text-fixly-accent transition-colors duration-200" />
                    ) : (
                      <Bell className="h-5 w-5 text-fixly-text group-hover:text-fixly-accent transition-colors duration-200" />
                    )}
                    
                    {/* Real-time connection indicator */}
                    {isRealTimeConnected && (
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                    )}
                  </div>
                  
                  {/* Notification badge with improved styling */}
                  {unreadCount > 0 && (
                    badgeStyle === 'dots' ? (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
                    ) : (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )
                  )}
                </button>

                {/* Notifications dropdown */}
                <AnimatePresence>
                  {notificationDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-80 bg-fixly-card border border-fixly-border rounded-lg shadow-fixly-lg z-50"
                    >
                      <div className="p-4 border-b border-fixly-border dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-fixly-text dark:text-gray-200">Notifications</h3>
                            {isRealTimeConnected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                Offline
                              </span>
                            )}
                          </div>
                          {notifications.some(n => !n.read) && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await markAllAsRead();
                              }}
                              className="text-xs text-fixly-accent hover:text-fixly-accent-dark dark:text-fixly-accent-light font-medium transition-colors duration-200"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-96 overflow-hidden">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-fixly-accent/10 dark:bg-fixly-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Bell className="h-6 w-6 text-fixly-accent dark:text-fixly-accent-light" />
                            </div>
                            <p className="text-fixly-text-muted dark:text-gray-400 text-sm">
                              No notifications yet
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-fixly-border dark:divide-gray-700">
                            {notifications.slice(0, 5).map((notification) => (
                              <motion.div
                                key={notification._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`
                                  p-4 hover:bg-fixly-bg/50 dark:hover:bg-gray-800/50 cursor-pointer transition-all duration-200
                                  ${!notification.read ? 'bg-fixly-accent/5 dark:bg-fixly-accent/10 border-l-4 border-l-fixly-accent' : ''}
                                `}
                                onClick={async () => {
                                  await handleNotificationClick(notification);
                                  setNotificationDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0">
                                    {notification.type === 'message' && (
                                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                        <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                      </div>
                                    )}
                                    {notification.type === 'job_applied' && (
                                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                        <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      </div>
                                    )}
                                    {notification.type.includes('application') && (
                                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                                        <Star className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                      </div>
                                    )}
                                    {(!['message', 'job_applied'].some(t => notification.type.includes(t)) && !notification.type.includes('application')) && (
                                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                      <p className={`text-sm font-medium ${
                                        !notification.read 
                                          ? 'text-fixly-text dark:text-gray-100' 
                                          : 'text-fixly-text-muted dark:text-gray-300'
                                      }`}>
                                        {notification.title}
                                      </p>
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <span className="text-xs text-fixly-text-muted dark:text-gray-500">
                                          {(() => {
                                            const date = new Date(notification.createdAt);
                                            const now = new Date();
                                            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
                                            
                                            if (diffInMinutes < 1) return 'Just now';
                                            if (diffInMinutes < 60) return `${diffInMinutes}m`;
                                            
                                            const diffInHours = Math.floor(diffInMinutes / 60);
                                            if (diffInHours < 24) return `${diffInHours}h`;
                                            
                                            const diffInDays = Math.floor(diffInHours / 24);
                                            if (diffInDays < 7) return `${diffInDays}d`;
                                            
                                            return date.toLocaleDateString();
                                          })()}
                                        </span>
                                        {!notification.read && (
                                          <div className="w-2 h-2 bg-fixly-accent rounded-full animate-pulse"></div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <p className="text-xs text-fixly-text-muted dark:text-gray-400 line-clamp-2 leading-relaxed">
                                      {notification.message}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                      {notifications.length > 5 && (
                        <div className="p-4 border-t border-fixly-border">
                          <button
                            onClick={() => router.push('/dashboard/notifications')}
                            className="text-fixly-accent hover:text-fixly-accent-dark text-sm font-medium"
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 p-2 hover:bg-fixly-accent/10 rounded-lg transition-colors"
                >
                  <img
                    src={user?.photoURL || '/default-avatar.png'}
                    alt={user?.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <ChevronDown className="h-4 w-4 text-fixly-text-muted" />
                </button>

                {/* Profile dropdown menu */}
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-fixly-card border border-fixly-border rounded-lg shadow-fixly-lg z-50"
                    >
                      <div className="p-4 border-b border-fixly-border">
                        <p className="font-medium text-fixly-text truncate">
                          {user?.name}
                        </p>
                        <p className="text-sm text-fixly-text-muted truncate">
                          @{user?.username}
                        </p>
                      </div>
                      <div className="py-2">
                        <button
                          onClick={() => {
                            router.push('/dashboard/profile');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10 flex items-center"
                        >
                          <User className="h-4 w-4 mr-3" />
                          Profile
                        </button>
                        <button
                          onClick={() => {
                            router.push('/dashboard/settings');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10 flex items-center"
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </button>
                        {user?.role === 'fixer' && (
                          <button
                            onClick={() => {
                              router.push('/dashboard/subscription');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10 flex items-center"
                          >
                            <Star className="h-4 w-4 mr-3" />
                            Upgrade to Pro
                          </button>
                        )}
                      </div>
                      <div className="border-t border-fixly-border py-2">
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>
    </div>
  );
}