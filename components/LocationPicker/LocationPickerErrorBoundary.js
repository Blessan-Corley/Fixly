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
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🗺️ LocationPicker Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to external service if available
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

  handleFallback = () => {
    // Call parent's fallback handler if provided
    if (this.props.onFallback) {
      this.props.onFallback();
    }
  };

  render() {
    if (this.state.hasError) {
      const isGoogleMapsError = this.state.error?.message?.includes('Google') ||
                               this.state.error?.message?.includes('maps') ||
                               this.state.error?.stack?.includes('maps.googleapis.com');

      const isNetworkError = this.state.error?.message?.includes('fetch') ||
                            this.state.error?.message?.includes('network') ||
                            this.state.error?.name === 'TypeError';

      const isPermissionError = this.state.error?.message?.includes('permission') ||
                               this.state.error?.message?.includes('geolocation');

      let errorTitle = 'Location Picker Error';
      let errorMessage = 'Something went wrong with the location picker.';
      let suggestions = [];

      if (isGoogleMapsError) {
        errorTitle = 'Maps Service Error';
        errorMessage = 'Unable to load Google Maps. This might be due to API key issues or network connectivity.';
        suggestions = [
          'Check your internet connection',
          'Verify Google Maps API key is valid',
          'Ensure required APIs are enabled (Maps JavaScript API, Places API)'
        ];
      } else if (isNetworkError) {
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to location services.';
        suggestions = [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the issue persists'
        ];
      } else if (isPermissionError) {
        errorTitle = 'Location Permission Error';
        errorMessage = 'Unable to access your location.';
        suggestions = [
          'Allow location access in your browser',
          'Check browser location settings',
          'You can still select location manually'
        ];
      } else {
        suggestions = [
          'Try refreshing the component',
          'Check your internet connection',
          'Contact support if the issue continues'
        ];
      }

      return (
        <div className="location-picker-error-boundary w-full h-full min-h-[400px] flex items-center justify-center bg-fixly-bg border-2 border-dashed border-fixly-border rounded-xl">
          <div className="text-center p-8 max-w-md mx-auto">
            {/* Error Icon */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-fixly-text mb-2">
                {errorTitle}
              </h3>
              <p className="text-fixly-text-light text-sm">
                {errorMessage}
              </p>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-6 text-left">
                <h4 className="text-sm font-medium text-fixly-text mb-2">
                  Try these solutions:
                </h4>
                <ul className="text-xs text-fixly-text-light space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1 h-1 bg-fixly-accent rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
                className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {this.state.retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
              </button>

              {this.props.allowFallback && (
                <button
                  onClick={this.handleFallback}
                  className="btn-ghost w-full flex items-center justify-center"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Text Input Instead
                </button>
              )}
            </div>

            {/* Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-fixly-text-muted cursor-pointer hover:text-fixly-text">
                  Debug Information
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">
                  <div className="text-red-600 mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div className="text-gray-600">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Retry Count */}
            {this.state.retryCount > 0 && (
              <div className="mt-4 text-xs text-fixly-text-muted">
                Retry attempts: {this.state.retryCount}/3
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LocationPickerErrorBoundary;