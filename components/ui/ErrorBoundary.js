'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Error caught by boundary:', error, errorInfo);
      // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          level={this.props.level || 'page'}
        />
      );
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, errorInfo, resetError, level }) {
  const router = useRouter();

  const handleRetry = () => {
    resetError();
    window.location.reload();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  // Different UI based on error level
  if (level === 'component') {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Something went wrong with this component</span>
        </div>
        <button
          onClick={resetError}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fixly-bg dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-fixly-card dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-fixly-border dark:border-gray-700">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-fixly-text dark:text-gray-100 mb-4">
            Oops! Something went wrong
          </h1>
          
          <p className="text-fixly-text-muted dark:text-gray-400 mb-6">
            {error?.message || "We encountered an unexpected error. Don't worry, our team has been notified."}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center space-x-2 bg-fixly-accent hover:bg-fixly-accent-dark text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>

            <div className="flex space-x-3">
              <button
                onClick={handleGoBack}
                className="flex-1 flex items-center justify-center space-x-2 bg-fixly-bg dark:bg-gray-700 hover:bg-fixly-border dark:hover:bg-gray-600 text-fixly-text dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors border border-fixly-border dark:border-gray-600"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go Back</span>
              </button>

              <button
                onClick={handleGoHome}
                className="flex-1 flex items-center justify-center space-x-2 bg-fixly-bg dark:bg-gray-700 hover:bg-fixly-border dark:hover:bg-gray-600 text-fixly-text dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors border border-fixly-border dark:border-gray-600"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>
            </div>
          </div>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-fixly-text-muted dark:text-gray-400 hover:text-fixly-text dark:hover:text-gray-200">
                Error Details (Dev Mode)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-gray-800 dark:text-gray-200">
                {error.stack}
              </pre>
              {errorInfo && (
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-gray-800 dark:text-gray-200">
                  {errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>

        {/* Help Link */}
        <p className="mt-6 text-sm text-fixly-text-muted dark:text-gray-400">
          Need help?{' '}
          <a 
            href="/support" 
            className="text-fixly-accent hover:text-fixly-accent-dark underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

// Specialized error boundaries for different contexts
export function ComponentErrorBoundary({ children, fallback }) {
  return (
    <ErrorBoundary level="component" fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

export function PageErrorBoundary({ children }) {
  return (
    <ErrorBoundary level="page">
      {children}
    </ErrorBoundary>
  );
}

export function APIErrorBoundary({ children }) {
  return (
    <ErrorBoundary level="api">
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;