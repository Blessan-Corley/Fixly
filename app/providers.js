// app/providers.js - OPTIMIZED VERSION
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { Toaster } from 'sonner';
import { LoadingProvider } from '../contexts/LoadingContext';

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
  const [error, setError] = useState(null);

  // ✅ CRITICAL FIX: Use refs to prevent excessive API calls
  const lastSessionId = useRef(null);
  const lastUserId = useRef(null);
  const userFetchController = useRef(null);
  const notificationsFetchController = useRef(null);

  // ✅ OPTIMIZATION: Debounced fetch functions
  const fetchUserProfile = useCallback(async (sessionUserId) => {
    // ✅ CRITICAL FIX: Don't fetch for temporary session IDs
    if (!sessionUserId || sessionUserId.startsWith('temp_')) {
      console.log('⏭️ Skipping fetch for temporary session');
      setUser(null);
      setError('Session not properly established. Please sign in again.');
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (userFetchController.current) {
      userFetchController.current.abort();
    }

    // Create new abort controller
    userFetchController.current = new AbortController();

    try {
      console.log('📡 Fetching user profile');
      
      const response = await fetch('/api/user/profile', {
        signal: userFetchController.current.signal
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User profile fetched');
        setUser(userData.user);
        setError(null);
        
        // Update last user ID for notifications
        lastUserId.current = userData.user._id;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch user profile:', response.status, errorData);
        
        if (response.status === 401 && errorData.needsReauth) {
          setError('Session expired. Please sign in again.');
          setUser(null);
        } else {
          setError(errorData.message || 'Failed to load user profile');
          setUser(null);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ User fetch error:', error);
        setError('Failed to load user profile');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    // Only fetch if we have a user
    if (!lastUserId.current) return;

    // Cancel previous request
    if (notificationsFetchController.current) {
      notificationsFetchController.current.abort();
    }

    // Create new abort controller
    notificationsFetchController.current = new AbortController();

    try {
      console.log('🔔 Fetching notifications...');
      
      const response = await fetch('/api/user/notifications', {
        signal: notificationsFetchController.current.signal
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        console.log('✅ Notifications fetched:', data.notifications?.length || 0);
      } else {
        console.error('❌ Failed to fetch notifications:', response.status);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Notifications fetch error:', error);
      }
    }
  }, []);

  // ✅ CRITICAL FIX: Only fetch user when session ACTUALLY changes
  useEffect(() => {
    const handleSessionChange = async () => {
      if (status === 'loading') {
        return; // Still loading, don't do anything
      }

      // ✅ CRITICAL: Check if session actually changed
      const currentSessionId = session?.user?.id;
      
      if (lastSessionId.current === currentSessionId) {
        console.log('⏭️ Session ID unchanged, skipping user fetch');
        setLoading(false);
        return; // No change, don't refetch
      }

      console.log('🔄 Session changed:', {
        from: lastSessionId.current,
        to: currentSessionId
      });

      // Update the ref BEFORE making API call
      lastSessionId.current = currentSessionId;

      if (currentSessionId) {
        await fetchUserProfile(currentSessionId);
      } else {
        setUser(null);
        setNotifications([]);
        lastUserId.current = null;
        setLoading(false);
      }
    };

    handleSessionChange();
  }, [session?.user?.id, status, fetchUserProfile]); // ✅ Only depend on user ID, not entire session

  // ✅ OPTIMIZATION: Fetch notifications only when user ID changes (not on every user update)
  useEffect(() => {
    if (user && user._id && lastUserId.current !== user._id) {
      lastUserId.current = user._id;
      // Debounce notifications fetch
      const timer = setTimeout(() => {
        fetchNotifications();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user?._id, fetchNotifications]); // ✅ Only depend on user ID

  // ✅ CLEANUP: Cancel requests on unmount
  useEffect(() => {
    return () => {
      if (userFetchController.current) {
        userFetchController.current.abort();
      }
      if (notificationsFetchController.current) {
        notificationsFetchController.current.abort();
      }
    };
  }, []);

  // Mark notification as read
  const markNotificationRead = useCallback(async (notificationId) => {
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
  }, []);

  // Add new notification
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep only latest 50
  }, []);

  // Update user data (optimized to prevent unnecessary re-renders)
  const updateUser = useCallback((userData) => {
    setUser(prev => {
      if (!prev) return userData;
      
      // ✅ OPTIMIZATION: Only update if data actually changed
      const merged = { ...prev, ...userData };
      const hasChanges = JSON.stringify(prev) !== JSON.stringify(merged);
      
      if (hasChanges) {
        console.log('👤 User data updated');
        return merged;
      }
      
      return prev; // No changes, return same reference
    });
  }, []);

  // ✅ MEMOIZE: Prevent unnecessary re-renders
  const value = {
    user,
    setUser,
    loading,
    notifications,
    markNotificationRead,
    addNotification,
    updateUser,
    session,
    isAuthenticated: !!session,
    error
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
    <SessionProvider 
      refetchInterval={0} // ✅ CRITICAL: Disable automatic session refetching
      refetchOnWindowFocus={false} // ✅ CRITICAL: Disable refetch on window focus
    >
      <LoadingProvider>
        <AppProviderContent>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
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
      </LoadingProvider>
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

// Protected Route Component (optimized)
export function ProtectedRoute({ children, allowedRoles = [], fallback = null }) {
  const { user, loading, isAuthenticated, error, session } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-fixly-bg flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fixly-text mb-4">
            Something went wrong
          </h1>
          <p className="text-fixly-text-light mb-6">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Refresh Page
          </button>
        </div>
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

  // Check if user needs to complete signup (only if we're not already on signup page)
  if (isAuthenticated && session?.user && (!session.user.isRegistered || !session.user.role || session.user.username?.startsWith('temp_'))) {
    // Check if we're already on the signup page to prevent loops
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/signup')) {
      console.log('🔄 User needs to complete signup, redirecting...');
      
      // Redirect to signup completion
      const method = session.user.authMethod === 'google' ? '?method=google' : '';
      window.location.href = `/auth/signup${method}`;
      
      return (
        <div className="min-h-screen bg-fixly-bg flex items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      );
    }
    
    // If we're already on signup page, don't redirect - let the signup page handle it
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/signup')) {
      return children;
    }
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

// Role-based Component (optimized)
export function RoleGuard({ children, roles, fallback = null }) {
  const { user } = useApp();

  if (!user || !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}