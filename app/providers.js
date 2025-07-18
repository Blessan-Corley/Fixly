// app/providers.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { Toaster } from 'sonner';

// App Context
const AppContext = createContext();

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// App Provider Component
function AppProviderContent({ children }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Fetch user data when session changes
  useEffect(() => {
    async function fetchUser() {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    if (status !== 'loading') {
      fetchUser();
    }
  }, [session, status]);

  // Fetch notifications for authenticated users
  useEffect(() => {
    async function fetchNotifications() {
      if (user) {
        try {
          const response = await fetch('/api/user/notifications');
          if (response.ok) {
            const data = await response.json();
            setNotifications(data.notifications || []);
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      }
    }

    fetchNotifications();
  }, [user]);

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      const response = await fetch('/api/user/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification._id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Add new notification
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  // Update user data
  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    setUser,
    loading,
    notifications,
    markNotificationRead,
    addNotification,
    updateUser,
    session,
    isAuthenticated: !!session
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Main Providers Component
export function Providers({ children }) {
  return (
    <SessionProvider>
      <AppProviderContent>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              border: '1px solid #e1e3e0',
              color: '#374650',
            },
            success: {
              style: {
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
              },
            },
            error: {
              style: {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
              },
            },
          }}
        />
      </AppProviderContent>
    </SessionProvider>
  );
}

// Loading Component
export function LoadingSpinner({ size = 'default' }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-2 border-fixly-accent border-t-transparent ${sizeClasses[size]}`}></div>
    </div>
  );
}

// Protected Route Component
export function ProtectedRoute({ children, allowedRoles = [], fallback = null }) {
  const { user, loading, isAuthenticated } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-fixly-bg flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) return fallback;
    
    return (
      <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fixly-text mb-4">
            Authentication Required
          </h1>
          <p className="text-fixly-text-light mb-6">
            Please sign in to access this page.
          </p>
          <a href="/auth/signin" className="btn-primary">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fixly-text mb-4">
            Access Denied
          </h1>
          <p className="text-fixly-text-light mb-6">
            You don't have permission to access this page.
          </p>
          <a href="/dashboard" className="btn-primary">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}

// Role-based Component
export function RoleGuard({ children, roles, fallback = null }) {
  const { user } = useApp();

  if (!user || !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}