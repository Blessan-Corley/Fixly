'use client';

import { AlertTriangle, RefreshCw, MapPin } from 'lucide-react';
import React from 'react';

import { env } from '@/lib/env';

type GtagFunction = (
  command: 'event',
  action: string,
  params: { description: string; fatal: boolean }
) => void;

type LocationPickerErrorBoundaryProps = {
  children: React.ReactNode;
  onFallbackMode?: () => void;
};

type LocationPickerErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
};

class LocationPickerErrorBoundary extends React.Component<
  LocationPickerErrorBoundaryProps,
  LocationPickerErrorBoundaryState
> {
  constructor(props: LocationPickerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<LocationPickerErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('LocationPicker Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (typeof window !== 'undefined') {
      const windowWithGtag = window as Window & { gtag?: GtagFunction };
      windowWithGtag.gtag?.('event', 'exception', {
        description: `LocationPicker Error: ${error.message}`,
        fatal: false,
      });
    }
  }

  handleRetry = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const message = this.state.error?.message?.toLowerCase() || '';
      const isGoogleMapsError =
        message.includes('google') || message.includes('maps') || message.includes('api');

      return (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
            Location Service Error
          </h3>

          <p className="mx-auto mb-4 max-w-md text-sm text-red-700 dark:text-red-300">
            {isGoogleMapsError
              ? "There's an issue with the Google Maps service. This might be due to network connectivity or API limitations."
              : 'Something went wrong with the location picker. Please try again or use manual address entry.'}
          </p>

          {env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-xs dark:border-red-800 dark:bg-red-900/20">
              <summary className="cursor-pointer font-medium text-red-800 dark:text-red-200">
                Debug Information
              </summary>
              <div className="mt-2 text-red-700 dark:text-red-300">
                <strong>Error:</strong> {this.state.error.message}
                <br />
                <strong>Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap text-xs">{this.state.error.stack}</pre>
              </div>
            </details>
          )}

          <div className="flex flex-col items-center justify-center space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
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

    return this.props.children;
  }
}

export const withLocationErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return function LocationPickerWithErrorBoundary(
    props: P & { onFallbackMode?: () => void }
  ): React.JSX.Element {
    return (
      <LocationPickerErrorBoundary onFallbackMode={props.onFallbackMode}>
        <WrappedComponent {...props} />
      </LocationPickerErrorBoundary>
    );
  };
};

export default LocationPickerErrorBoundary;
