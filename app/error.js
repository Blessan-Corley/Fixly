// app/error.js
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home, AlertTriangle, Wrench } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);
    
    // In production, you might want to log this to an error reporting service
    // logErrorToService(error);
  }, [error]);

  const handleRefresh = () => {
    // Reset the error boundary
    reset();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Wrench className="h-12 w-12 text-fixly-accent mr-3" />
            <span className="text-3xl font-bold text-fixly-text">Fixly</span>
          </div>

          {/* Error Illustration */}
          <div className="mb-8">
            <div className="w-32 h-32 bg-red-50 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-fixly-text mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-fixly-text-light mb-8">
            We encountered an unexpected error. Don&apos;t worry, our team has been notified 
            and we&apos;re working to fix it.
          </p>

          {/* Error Details (only in development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
              <pre className="text-xs text-red-700 overflow-auto">
                {error.message}
              </pre>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-red-600 mt-2 overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleRefresh}
              className="btn-primary w-full flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
            
            <button
              onClick={handleGoHome}
              className="btn-secondary w-full flex items-center justify-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-8 pt-6 border-t border-fixly-border">
            <p className="text-sm text-fixly-text-muted mb-4">
              Still having issues?
            </p>
            <div className="flex flex-col space-y-2 text-sm">
              <a
                href="mailto:blessancorley@gmail.com"
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                Contact Support
              </a>
              <a
                href="/help"
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                Help Center
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}