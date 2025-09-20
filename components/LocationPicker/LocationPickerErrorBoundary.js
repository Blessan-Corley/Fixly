'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, MapPin } from 'lucide-react';

class LocationPickerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('LocationPicker Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report to error monitoring service (if available)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `LocationPicker Error: ${error.message}`,
        fatal: false
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      const isGoogleMapsError = this.state.error?.message?.includes('google') ||
                               this.state.error?.message?.includes('maps') ||
                               this.state.error?.message?.includes('API');

      return (
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Location Service Error
          </h3>

          <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-md mx-auto">
            {isGoogleMapsError
              ? "There's an issue with the Google Maps service. This might be due to network connectivity or API limitations."
              : "Something went wrong with the location picker. Please try again or use manual address entry."
            }
          </p>

          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-xs">
              <summary className="cursor-pointer font-medium text-red-800 dark:text-red-200">
                Debug Information
              </summary>
              <div className="mt-2 text-red-700 dark:text-red-300">
                <strong>Error:</strong> {this.state.error.message}
                <br />
                <strong>Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap text-xs">
                  {this.state.error.stack}
                </pre>
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
            {this.state.retryCount < 3 && (
              <button
                onClick={this.handleRetry}
                className="btn-primary flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            )}

            {this.props.onFallbackMode && (
              <button
                onClick={this.props.onFallbackMode}
                className="btn-secondary flex items-center space-x-2"
              >
                <MapPin className="h-4 w-4" />
                <span>Enter Address Manually</span>
              </button>
            )}
          </div>

          {/* Help text */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {isGoogleMapsError && (
              <p>
                If this problem persists, try refreshing the page or check your internet connection.
              </p>
            )}
            {this.state.retryCount >= 3 && (
              <p className="text-red-600 dark:text-red-400">
                Multiple retry attempts failed. Please contact support if the issue continues.
              </p>
            )}
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

// HOC wrapper for easier usage with functional components
export const withLocationErrorBoundary = (WrappedComponent) => {
  return function LocationPickerWithErrorBoundary(props) {
    return (
      <LocationPickerErrorBoundary onFallbackMode={props.onFallbackMode}>
        <WrappedComponent {...props} />
      </LocationPickerErrorBoundary>
    );
  };
};

export default LocationPickerErrorBoundary;