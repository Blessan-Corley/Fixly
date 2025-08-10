// components/ui/GlobalLoading.js
'use client';

import { Loader, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Global loading component with timeout message
 * @param {Object} props
 * @param {boolean} props.loading - Whether to show loading state
 * @param {boolean} props.showRefreshMessage - Whether to show refresh message
 * @param {string} props.message - Loading message (default: "Loading...")
 * @param {string} props.timeoutMessage - Timeout message
 * @param {Function} props.onRefresh - Function to call when refresh is clicked
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.fullScreen - Whether to use full screen loading
 * @returns {JSX.Element}
 */
export function GlobalLoading({
  loading = false,
  showRefreshMessage = false,
  message = "Loading...",
  timeoutMessage = "Taking longer than usual?",
  onRefresh = () => window.location.reload(),
  className = "",
  fullScreen = false
}) {
  if (!loading) return null;

  const containerClass = fullScreen 
    ? "fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
    : "flex flex-col items-center justify-center min-h-[300px] p-8";

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Loading Spinner */}
      <div className="flex flex-col items-center space-y-4">
        <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        <p className="text-fixly-text-light text-lg">{message}</p>
      </div>

      {/* Timeout Message */}
      {showRefreshMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md text-center mt-6 animate-in slide-in-from-bottom-4 duration-300">
          <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-3" />
          
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            {timeoutMessage}
          </h3>
          
          <p className="text-sm text-yellow-700 mb-4">
            This might help resolve the issue:
          </p>
          
          <div className="space-y-3">
            <button
              onClick={onRefresh}
              className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Page</span>
            </button>
            
            <div className="text-xs text-yellow-600 space-y-1">
              <p>• Check your internet connection</p>
              <p>• Try refreshing the page</p>
              <p>• Contact support if issue persists</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline loading component for smaller sections
 */
export function InlineLoading({
  loading = false,
  showRefreshMessage = false,
  message = "Loading...",
  onRefresh,
  size = "sm"
}) {
  if (!loading) return null;

  const sizeClasses = {
    xs: "h-4 w-4",
    sm: "h-5 w-5", 
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className="flex flex-col items-center space-y-3 p-4">
      <div className="flex items-center space-x-2">
        <Loader className={`animate-spin text-fixly-accent ${sizeClasses[size]}`} />
        <span className="text-fixly-text-light text-sm">{message}</span>
      </div>
      
      {showRefreshMessage && (
        <div className="text-center">
          <p className="text-xs text-yellow-700 mb-2">Taking too long?</p>
          <button
            onClick={onRefresh || (() => window.location.reload())}
            className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full hover:bg-yellow-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Loading overlay for existing content
 */
export function LoadingOverlay({
  loading = false,
  showRefreshMessage = false,
  message = "Loading...",
  onRefresh,
  children
}) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-10">
          <GlobalLoading
            loading={loading}
            showRefreshMessage={showRefreshMessage}
            message={message}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}

export default GlobalLoading;