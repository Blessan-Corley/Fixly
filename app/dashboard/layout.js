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
import { toast } from 'sonner';

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <DashboardContent>{children}</DashboardContent>
    </ProtectedRoute>
  );
}

function DashboardContent({ children }) {
  const { user, notifications, markNotificationRead } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

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
      toast.error('Error signing out');
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
        current: pathname.startsWith('/dashboard/messages')
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
          current: pathname.startsWith('/dashboard/jobs')
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
          current: pathname.startsWith('/dashboard/applications')
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
              {/* Notifications */}
              <div className="relative notification-dropdown">
                <button
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className="relative p-2 hover:bg-fixly-accent/10 rounded-lg transition-colors"
                >
                  <Bell className="h-5 w-5 text-fixly-text" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
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
                      <div className="p-4 border-b border-fixly-border">
                        <h3 className="font-semibold text-fixly-text">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-fixly-text-muted">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((notification) => (
                            <div
                              key={notification._id}
                              className={`p-4 border-b border-fixly-border hover:bg-fixly-bg cursor-pointer ${
                                !notification.read ? 'bg-fixly-accent/5' : ''
                              }`}
                              onClick={() => markNotificationRead(notification._id)}
                            >
                              <div className="flex items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-fixly-text text-sm">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-fixly-text-muted mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-fixly-text-muted mt-2">
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-fixly-accent rounded-full ml-2 mt-1"></div>
                                )}
                              </div>
                            </div>
                          ))
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