// app/providers.js - OPTIMIZED VERSION
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { Toaster } from 'sonner';
import { LoadingProvider } from '../contexts/LoadingContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AblyProvider, useAbly } from '../contexts/AblyContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import QueryProvider, { QueryPerformanceMonitor, QueryErrorBoundary } from '../components/providers/QueryProvider';
import DarkModeManager from '../components/ui/DarkModeManager';
import GlobalBanModal from '../components/ui/GlobalBanModal';

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
  const { notifications, unreadCount, clearNotification, clearAllNotifications } = useAbly();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize network status monitoring
  const { isOnline, checkConnection } = useNetworkStatus();

  // ✅ CRITICAL FIX: Use refs to prevent excessive API calls
  const lastSessionId = useRef(null);
  const lastUserId = useRef(null);
  const userFetchController = useRef(null);

  // ✅ OPTIMIZATION: Debounced fetch functions
  const fetchUserProfile = useCallback(async (sessionUserId) => {
    // ✅ CRITICAL FIX: Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // ✅ CRITICAL FIX: Don't fetch for temporary session IDs
    if (!sessionUserId || sessionUserId.startsWith('temp_') || sessionUserId.startsWith('tmp_')) {
      console.log('⏭️ Skipping fetch for temporary session');
      setUser(null);
      setError('Session not properly established. Please sign in again.');
      setLoading(false);
      return;
    }

    // Check cache first (30 second TTL)
    const cacheKey = `user_profile_${sessionUserId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // Use cache if less than 30 seconds old
        if (age < 30000) {
          console.log('💾 Using cached user profile');
          setUser(data);
          setError(null);
          lastUserId.current = data._id;
          setLoading(false);
          return;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
        localStorage.removeItem(cacheKey);
      }
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
        signal: userFetchController.current.signal,
        headers: {
          'Cache-Control': 'no-cache' // Ensure we get fresh data when needed
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User profile fetched');
        setUser(userData.user);
        setError(null);

        // Update last user ID for notifications
        lastUserId.current = userData.user._id;

        // Cache the result
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: userData.user,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Storage full or disabled, ignore
          console.warn('Could not cache user profile:', e.message);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch user profile:', response.status, errorData);

        // Clear invalid cache
        localStorage.removeItem(cacheKey);

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
  }, [setUser, setError, setLoading]);


  // ✅ CRITICAL FIX: Only fetch user when session ACTUALLY changes
  useEffect(() => {
    // ✅ CRITICAL FIX: Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
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
        lastUserId.current = null;
        setLoading(false);
      }
    };

    handleSessionChange();
  }, [session?.user?.id, status, fetchUserProfile]); // ✅ Only depend on user ID, not entire session


  // ✅ CLEANUP: Cancel requests on unmount
  useEffect(() => {
    return () => {
      if (userFetchController.current) {
        userFetchController.current.abort();
      }
    };
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
  }, [setUser]);

  // ✅ MEMOIZE: Prevent unnecessary re-renders
  const value = {
    user,
    setUser,
    loading,
    notifications,
    unreadCount,
    clearNotification,
    clearAllNotifications,
    updateUser,
    session,
    isAuthenticated: !!session,
    error,
    // Network status
    isOnline,
    checkConnection
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
    <QueryErrorBoundary>
      <QueryProvider>
        <SessionProvider
          refetchInterval={0} // ✅ CRITICAL: Disable automatic session refetching
          refetchOnWindowFocus={false} // ✅ CRITICAL: Disable refetch on window focus
        >
          <ThemeProvider>
            <LoadingProvider>
              <AblyProvider>
                <AppProviderContent>
                  <DarkModeManager>
                    {children}
                  </DarkModeManager>
                  <GlobalBanModal />
                  <QueryPerformanceMonitor />
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
              </AblyProvider>
            </LoadingProvider>
          </ThemeProvider>
        </SessionProvider>
      </QueryProvider>
    </QueryErrorBoundary>
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
  if (isAuthenticated && session?.user && (!session.user.isRegistered || !session.user.role || session.user.username?.startsWith('temp_') || session.user.username?.startsWith('tmp_'))) {
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
            You don&apos;t have permission to access this page.
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