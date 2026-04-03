// Phase 2: Replaced predictable client-side CSRF headers with authenticated in-memory tokens.
'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { type ReactNode, useContext } from 'react';
import { Toaster } from 'sonner';

import CookieConsent from '../components/CookieConsent';
import QueryProvider, {
  QueryPerformanceMonitor,
  QueryErrorBoundary,
} from '../components/providers/QueryProvider';
import { RealtimeProvider } from '../components/providers/RealtimeProvider';
import { ConnectionStatus } from '../components/realtime/ConnectionStatus';
import DarkModeManager from '../components/ui/DarkModeManager';
import GlobalBanModal from '../components/ui/GlobalBanModal';
import PWAInstallPrompt from '../components/ui/PWAInstallPrompt';
import { LoadingProvider } from '../contexts/LoadingContext';
import { ThemeProvider } from '../contexts/ThemeContext';

import { AppContext, isRole, isTemporaryUsername } from './providers.helpers';
import type {
  AppProviderContentProps,
  LoadingSpinnerProps,
  ProvidersProps,
  ProtectedRouteProps,
  RoleGuardProps,
} from './providers.types';
import { useAppProviderContent } from './useAppProviderContent';

export type { AppNotification, AppUser } from './providers.types';

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

function AppProviderContent({ children }: AppProviderContentProps) {
  const contextValue = useAppProviderContent();
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

function AuthenticatedRealtimeProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'authenticated') {
    return (
      <RealtimeProvider>
        <ConnectionStatus />
        {children}
      </RealtimeProvider>
    );
  }
  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <QueryErrorBoundary>
        <QueryProvider>
          <AuthenticatedRealtimeProvider>
            <ThemeProvider>
              <LoadingProvider>
                <AppProviderContent>
                  <DarkModeManager>{children}</DarkModeManager>
                  <PWAInstallPrompt />
                  <CookieConsent />
                  <GlobalBanModal />
                  <QueryPerformanceMonitor />
                  <Toaster position="bottom-right" richColors closeButton duration={4000} />
                </AppProviderContent>
              </LoadingProvider>
            </ThemeProvider>
          </AuthenticatedRealtimeProvider>
        </QueryProvider>
      </QueryErrorBoundary>
    </SessionProvider>
  );
}

export function LoadingSpinner({ size = 'default' }: LoadingSpinnerProps) {
  const sizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-2 border-fixly-accent border-t-transparent ${sizeClasses[size]}`}
      />
    </div>
  );
}

export function ProtectedRoute({
  children,
  allowedRoles = [],
  fallback = null,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, error, session } = useApp();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fixly-bg">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fixly-bg p-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-fixly-text">Something went wrong</h1>
          <p className="mb-6 text-fixly-text-light">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-fixly-bg p-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-fixly-text">Authentication Required</h1>
          <p className="mb-6 text-fixly-text-light">Please sign in to access this page.</p>
          <a href="/auth/signin" className="btn-primary">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const shouldCompleteSignup =
    session?.user &&
    (session.user.isRegistered === false ||
      !session.user.role ||
      isTemporaryUsername(session.user.username));

  if (shouldCompleteSignup) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/signup')) {
      const method = session.user.authMethod === 'google' ? '?method=google' : '';
      window.location.href = `/auth/signup${method}`;
      return (
        <div className="flex min-h-screen items-center justify-center bg-fixly-bg">
          <LoadingSpinner size="large" />
        </div>
      );
    }

    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/signup')) {
      return <>{children}</>;
    }
  }

  const currentRole = isRole(user?.role) ? user.role : undefined;
  if (allowedRoles.length > 0 && (!currentRole || !allowedRoles.includes(currentRole))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fixly-bg p-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-fixly-text">Access Denied</h1>
          <p className="mb-6 text-fixly-text-light">
            You don&apos;t have permission to access this page.
          </p>
          <a href="/dashboard" className="btn-primary">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function RoleGuard({ children, roles, fallback = null }: RoleGuardProps) {
  const { user } = useApp();

  if (!isRole(user?.role) || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
