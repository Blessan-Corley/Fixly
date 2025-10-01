'use client';

import { motion } from 'framer-motion';
import { Loader2, Zap, Building2, User, Briefcase, MessageSquare, Search, Filter } from 'lucide-react';

// Base Spinner Component
export function Spinner({ size = 'default', className = '' }) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <Loader2 className={`animate-spin text-fixly-accent ${sizeClasses[size]} ${className}`} />
  );
}

// Enhanced Loading Spinner with context
export function LoadingSpinner({ 
  size = 'default', 
  message = '', 
  showMessage = false,
  variant = 'default',
  className = '' 
}) {
  const variants = {
    default: 'text-fixly-accent',
    primary: 'text-fixly-accent',
    secondary: 'text-fixly-text-muted',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`${variants[variant]}`}
      >
        <Spinner size={size} />
      </motion.div>
      {showMessage && message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-fixly-text-muted dark:text-gray-400 font-medium"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

// Skeleton Loaders for different content types
export function SkeletonLoader({ type = 'default', count = 1, className = '' }) {
  const skeletons = Array.from({ length: count }, (_, index) => {
    switch (type) {
      case 'job-card':
        return (
          <div key={index} className="bg-fixly-card dark:bg-gray-800 rounded-xl p-4 border border-fixly-border dark:border-gray-700">
            <div className="animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
              <div className="flex space-x-2 mb-3">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex space-x-2">
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile-card':
        return (
          <div key={index} className="bg-fixly-card dark:bg-gray-800 rounded-xl p-4 border border-fixly-border dark:border-gray-700">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        );

      case 'message':
        return (
          <div key={index} className="flex space-x-3 mb-4">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="bg-fixly-card dark:bg-gray-800 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        );

      case 'list-item':
        return (
          <div key={index} className="flex items-center space-x-3 p-3 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        );

      default:
        return (
          <div key={index} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        );
    }
  });

  return <div className={className}>{skeletons}</div>;
}

// Context-specific loading components
export function JobsLoading({ count = 6 }) {
  return (
    <div className="space-y-4">
      <SkeletonLoader type="job-card" count={count} />
    </div>
  );
}

export function ProfilesLoading({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SkeletonLoader type="profile-card" count={count} />
    </div>
  );
}

export function MessagesLoading({ count = 5 }) {
  return (
    <div className="space-y-2">
      <SkeletonLoader type="message" count={count} />
    </div>
  );
}

// Page-level loading screens
export function PageLoading({ 
  icon: Icon = Zap, 
  title = "Loading...", 
  subtitle = "Please wait while we fetch your data",
  showProgress = false,
  progress = 0
}) {
  return (
    <div className="min-h-screen bg-fixly-bg dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-fixly-accent to-fixly-accent-dark rounded-2xl shadow-xl">
            <Icon className="h-10 w-10 text-white" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-fixly-text dark:text-gray-100 mb-2"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-fixly-text-muted dark:text-gray-400 mb-8"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <LoadingSpinner size="lg" />
        </motion.div>

        {showProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-fixly-accent h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm text-fixly-text-muted dark:text-gray-400 mt-2">
              {progress}% complete
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Context-specific page loaders
export function DashboardLoading() {
  return <PageLoading icon={Building2} title="Loading Dashboard" subtitle="Preparing your workspace..." />;
}

export function ProfileLoading() {
  return <PageLoading icon={User} title="Loading Profile" subtitle="Fetching user information..." />;
}

// Duplicate JobsLoading removed - using the one with count parameter above

// Duplicate MessagesLoading removed - using the one with count parameter above

export function SearchLoading() {
  return <PageLoading icon={Search} title="Searching..." subtitle="Finding the best matches for you..." />;
}

// Button loading states
export function ButtonLoading({ 
  children, 
  loading = false, 
  disabled = false, 
  size = 'default',
  variant = 'primary',
  className = '',
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    default: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl'
  };

  const variantClasses = {
    primary: 'bg-fixly-accent hover:bg-fixly-accent-dark text-white shadow-sm hover:shadow-md',
    secondary: 'bg-fixly-bg hover:bg-fixly-border text-fixly-text border border-fixly-border',
    ghost: 'hover:bg-fixly-accent/10 text-fixly-accent',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
}

// Inline loading states
export function InlineLoading({ message = "Loading..." }) {
  return (
    <div className="flex items-center space-x-2 text-fixly-text-muted dark:text-gray-400">
      <Spinner size="sm" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Export all components
export default {
  Spinner,
  LoadingSpinner,
  SkeletonLoader,
  JobsLoading,
  ProfilesLoading,
  MessagesLoading,
  PageLoading,
  DashboardLoading,
  ProfileLoading,
  SearchLoading,
  ButtonLoading,
  InlineLoading
};