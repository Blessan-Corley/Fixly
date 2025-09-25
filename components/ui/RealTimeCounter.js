/**
 * Real-time Counter Component with Animations
 * Shows live counts with smooth animations and notification badges
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAbly } from '@/contexts/AblyContext';

export function RealTimeCounter({
  initialValue = 0,
  label,
  icon,
  color = 'primary',
  size = 'default',
  showBadge = false,
  badgeColor = 'danger',
  animate = true,
  suffix = '',
  prefix = '',
  channelName,
  eventName
}) {
  const [count, setCount] = useState(initialValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const prevCountRef = useRef(initialValue);
  const { subscribeToChannel } = useAbly();

  // Size configurations
  const sizeClasses = {
    small: {
      container: 'text-sm',
      count: 'text-lg font-semibold',
      badge: 'text-xs px-1.5 py-0.5'
    },
    default: {
      container: 'text-base',
      count: 'text-2xl font-bold',
      badge: 'text-sm px-2 py-1'
    },
    large: {
      container: 'text-lg',
      count: 'text-4xl font-bold',
      badge: 'text-base px-3 py-1.5'
    }
  };

  // Color configurations using existing Fixly colors
  const colorClasses = {
    primary: {
      text: 'text-fixly-primary',
      bg: 'bg-fixly-bg-secondary',
      badge: 'bg-fixly-primary text-white'
    },
    success: {
      text: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      badge: 'bg-green-600 text-white'
    },
    warning: {
      text: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      badge: 'bg-amber-600 text-white'
    },
    danger: {
      text: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      badge: 'bg-red-600 text-white'
    }
  };

  // Badge color configurations using existing Fixly colors
  const badgeColorClasses = {
    primary: 'bg-fixly-primary text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-amber-600 text-white',
    danger: 'bg-red-600 text-white'
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!channelName || !eventName) return;

    const unsubscribe = subscribeToChannel(channelName, eventName, (message) => {
      const newCount = message.data.count || message.data.newCount || message.data.value;

      if (typeof newCount === 'number' && newCount !== count) {
        updateCount(newCount);
      }
    });

    return unsubscribe;
  }, [channelName, eventName, subscribeToChannel, count]);

  // Update count with animation
  const updateCount = (newValue) => {
    if (!animate) {
      setCount(newValue);
      return;
    }

    const prevCount = prevCountRef.current;
    const difference = newValue - prevCount;

    if (difference === 0) return;

    setIsAnimating(true);
    setLastUpdate(Date.now());

    // Animate the count change
    if (Math.abs(difference) <= 10) {
      // For small changes, animate incrementally
      animateIncremental(prevCount, newValue);
    } else {
      // For large changes, just update with animation
      setCount(newValue);
      setTimeout(() => setIsAnimating(false), 500);
    }

    prevCountRef.current = newValue;
  };

  // Incremental animation for small number changes
  const animateIncremental = (from, to) => {
    const duration = 800;
    const steps = Math.abs(to - from);
    const stepDuration = duration / steps;
    const increment = to > from ? 1 : -1;

    let current = from;
    const timer = setInterval(() => {
      current += increment;
      setCount(current);

      if (current === to) {
        clearInterval(timer);
        setIsAnimating(false);
      }
    }, stepDuration);
  };

  // Format number with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Check if count should show badge
  const shouldShowBadge = showBadge && count > 0;

  return (
    <div className={`relative inline-flex items-center gap-2 ${sizeClasses[size].container}`}>
      {/* Icon */}
      {icon && (
        <div className={`${colorClasses[color].text} transition-colors duration-300`}>
          {icon}
        </div>
      )}

      {/* Counter Container */}
      <div className="relative">
        {/* Main Count */}
        <div className={`
          ${sizeClasses[size].count}
          ${colorClasses[color].text}
          ${isAnimating ? 'animate-count-up' : ''}
          transition-all duration-300
          ${isAnimating ? 'scale-110' : 'scale-100'}
        `}>
          {prefix}{formatNumber(count)}{suffix}
        </div>

        {/* Badge */}
        {shouldShowBadge && (
          <div className={`
            notification-badge
            ${badgeColorClasses[badgeColor]}
            ${sizeClasses[size].badge}
            ${lastUpdate && Date.now() - lastUpdate < 1000 ? 'new' : ''}
          `}>
            {count > 99 ? '99+' : count}
          </div>
        )}

        {/* Update Flash Effect */}
        {isAnimating && (
          <div className={`
            absolute inset-0
            ${colorClasses[color].bg}
            rounded-lg opacity-20
            animate-pulse-update
          `} />
        )}
      </div>

      {/* Label */}
      {label && (
        <span className="text-secondary font-medium">
          {label}
        </span>
      )}

      {/* Live Indicator */}
      {channelName && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs text-secondary">LIVE</span>
        </div>
      )}
    </div>
  );
}

// Notification Counter specifically for unread counts
export function NotificationCounter({
  unreadCount = 0,
  maxDisplay = 99,
  className = "",
  onClick,
  ...props
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 rounded-lg transition-all duration-200
        hover:bg-fixly-bg-secondary focus:outline-none focus:ring-2
        focus:ring-fixly-primary focus:ring-offset-2
        ${className}
      `}
      {...props}
    >
      {/* Bell Icon */}
      <svg
        className="w-6 h-6 text-fixly-text-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="notification-badge">
          {unreadCount > maxDisplay ? `${maxDisplay}+` : unreadCount}
        </div>
      )}
    </button>
  );
}

// Job Statistics Dashboard
export function JobStatsDisplay({ jobId }) {
  const { subscribeToChannel } = useAbly();
  const [stats, setStats] = useState({
    views: 0,
    applications: 0,
    comments: 0,
    likes: 0
  });

  useEffect(() => {
    if (!jobId) return;

    // Subscribe to various job statistics
    const channels = [
      { channel: `job:${jobId}:views`, event: 'view_added', key: 'views' },
      { channel: `job:${jobId}:applications`, event: 'application_submitted', key: 'applications' },
      { channel: `job:${jobId}:comments`, event: 'comment_posted', key: 'comments' },
      { channel: `job:${jobId}:likes`, event: 'like_added', key: 'likes' }
    ];

    const unsubscribers = channels.map(({ channel, event, key }) =>
      subscribeToChannel(channel, event, (message) => {
        setStats(prev => ({
          ...prev,
          [key]: message.data.count || (prev[key] + 1)
        }));
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [jobId, subscribeToChannel]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-fixly-bg-secondary rounded-lg">
      <RealTimeCounter
        initialValue={stats.views}
        label="Views"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        }
        color="primary"
        size="small"
        channelName={`job:${jobId}:views`}
        eventName="view_added"
      />

      <RealTimeCounter
        initialValue={stats.applications}
        label="Applications"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        color="success"
        size="small"
        showBadge={stats.applications > 0}
        channelName={`job:${jobId}:applications`}
        eventName="application_submitted"
      />

      <RealTimeCounter
        initialValue={stats.comments}
        label="Comments"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }
        color="warning"
        size="small"
        channelName={`job:${jobId}:comments`}
        eventName="comment_posted"
      />

      <RealTimeCounter
        initialValue={stats.likes}
        label="Likes"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        }
        color="danger"
        size="small"
        channelName={`job:${jobId}:likes`}
        eventName="like_added"
      />
    </div>
  );
}