'use client';

import { Loader, AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

type InlineLoadingSize = 'xs' | 'sm' | 'md' | 'lg';

export interface GlobalLoadingProps {
  loading?: boolean;
  showRefreshMessage?: boolean;
  message?: string;
  timeoutMessage?: string;
  onRefresh?: () => void;
  className?: string;
  fullScreen?: boolean;
}

export function GlobalLoading({
  loading = false,
  showRefreshMessage = false,
  message = 'Loading...',
  timeoutMessage = 'Taking longer than usual?',
  onRefresh = () => window.location.reload(),
  className = '',
  fullScreen = false,
}: GlobalLoadingProps) {
  if (!loading) return null;

  const containerClass = fullScreen
    ? 'fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center min-h-[300px] p-8';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
        <p className="text-lg text-fixly-text-light">{message}</p>
      </div>

      {showRefreshMessage && (
        <div className="mt-6 max-w-md rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center duration-300 animate-in slide-in-from-bottom-4">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-yellow-600" />

          <h3 className="mb-2 text-lg font-semibold text-yellow-800">{timeoutMessage}</h3>

          <p className="mb-4 text-sm text-yellow-700">This might help resolve the issue:</p>

          <div className="space-y-3">
            <button
              onClick={onRefresh}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-yellow-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Page</span>
            </button>

            <div className="space-y-1 text-xs text-yellow-600">
              <p>- Check your internet connection</p>
              <p>- Try refreshing the page</p>
              <p>- Contact support if issue persists</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface InlineLoadingProps {
  loading?: boolean;
  showRefreshMessage?: boolean;
  message?: string;
  onRefresh?: () => void;
  size?: InlineLoadingSize;
}

const SIZE_CLASSES: Record<InlineLoadingSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function InlineLoading({
  loading = false,
  showRefreshMessage = false,
  message = 'Loading...',
  onRefresh,
  size = 'sm',
}: InlineLoadingProps) {
  if (!loading) return null;

  return (
    <div className="flex flex-col items-center space-y-3 p-4">
      <div className="flex items-center space-x-2">
        <Loader className={`animate-spin text-fixly-accent ${SIZE_CLASSES[size]}`} />
        <span className="text-sm text-fixly-text-light">{message}</span>
      </div>

      {showRefreshMessage && (
        <div className="text-center">
          <p className="mb-2 text-xs text-yellow-700">Taking too long?</p>
          <button
            onClick={onRefresh ?? (() => window.location.reload())}
            className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-800 transition-colors hover:bg-yellow-200"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}

export interface LoadingOverlayProps {
  loading?: boolean;
  showRefreshMessage?: boolean;
  message?: string;
  onRefresh?: () => void;
  children: ReactNode;
}

export function LoadingOverlay({
  loading = false,
  showRefreshMessage = false,
  message = 'Loading...',
  onRefresh,
  children,
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-80 backdrop-blur-sm">
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
