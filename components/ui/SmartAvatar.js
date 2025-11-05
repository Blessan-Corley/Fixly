'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';

/**
 * Smart Avatar Component
 * Displays user profile photos with fallback to initials and then to icon
 * Handles loading states and error states gracefully
 */
export default function SmartAvatar({
  user,
  size = 'default',
  showBorder = false,
  borderColor = 'border-fixly-border',
  className = '',
  onClick,
  alt,
  showTooltip = false
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Size configurations
  const sizeConfigs = {
    xs: {
      container: 'w-6 h-6',
      text: 'text-xs',
      icon: 'w-3 h-3'
    },
    sm: {
      container: 'w-8 h-8',
      text: 'text-sm',
      icon: 'w-4 h-4'
    },
    default: {
      container: 'w-10 h-10',
      text: 'text-base',
      icon: 'w-5 h-5'
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-lg',
      icon: 'w-6 h-6'
    },
    xl: {
      container: 'w-16 h-16',
      text: 'text-xl',
      icon: 'w-8 h-8'
    },
    '2xl': {
      container: 'w-20 h-20',
      text: 'text-2xl',
      icon: 'w-10 h-10'
    },
    '3xl': {
      container: 'w-24 h-24',
      text: 'text-3xl',
      icon: 'w-12 h-12'
    }
  };

  const config = sizeConfigs[size] || sizeConfigs.default;

  // Reset states when user changes
  useEffect(() => {
    if (user?.image || user?.profilePhoto?.url) {
      setImageLoaded(false);
      setImageError(false);
      setImageLoading(true);
    }
  }, [user?.image, user?.profilePhoto?.url]);

  // Generate initials from user name
  const getInitials = (name) => {
    if (!name) return 'U';

    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 0) return 'U';

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    // First letter of first and last word
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Generate color based on name for consistent colors
  const getBackgroundColor = (name) => {
    if (!name) return 'bg-fixly-primary';

    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
    setImageLoading(false);
  };

  // Get image source with priority order
  const getImageSource = () => {
    // Check for actual photo URLs, skip default placeholders
    const photoUrl = user?.profilePhoto?.url || user?.image || user?.picture || user?.photoURL;

    // Don't use default avatar images - we'll show initials instead
    if (!photoUrl || photoUrl.includes('/default-avatar') || photoUrl.includes('default.png')) {
      return null;
    }

    return photoUrl;
  };

  const imageSource = getImageSource();
  const userName = user?.name || user?.username || 'User';
  const initials = getInitials(userName);
  const bgColor = getBackgroundColor(userName);

  // Determine what to show
  const showImage = imageSource && imageLoaded && !imageError;
  const showInitials = !showImage && userName && initials;
  const showIcon = !showImage && !showInitials;

  const containerClasses = `
    ${config.container}
    rounded-full
    flex items-center justify-center
    overflow-hidden
    relative
    transition-all duration-200
    ${showBorder ? `border-2 ${borderColor}` : ''}
    ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
    ${showImage ? 'bg-fixly-bg-secondary' : bgColor}
    ${className}
  `;

  const content = (
    <div
      className={containerClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={alt || `Avatar for ${userName}`}
    >
      {/* Loading state */}
      {imageLoading && imageSource && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
      )}

      {/* Profile image */}
      {imageSource && (
        <img
          src={imageSource}
          alt={alt || `Profile picture of ${userName}`}
          className={`
            w-full h-full object-cover
            transition-opacity duration-300
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}

      {/* Initials fallback */}
      {showInitials && (
        <span className={`
          ${config.text}
          font-semibold
          text-white
          select-none
        `}>
          {initials}
        </span>
      )}

      {/* Icon fallback */}
      {showIcon && (
        <User className={`${config.icon} text-white`} />
      )}

      {/* Loading overlay */}
      {imageLoading && imageSource && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-full">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        </div>
      )}
    </div>
  );

  // Wrap with tooltip if enabled
  if (showTooltip && userName) {
    return (
      <div className="relative group">
        {content}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          {userName}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      </div>
    );
  }

  return content;
}

// Avatar group component for showing multiple avatars
export function AvatarGroup({
  users = [],
  max = 3,
  size = 'default',
  showRemaining = true,
  className = '',
  spacing = '-ml-2'
}) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className={`flex items-center ${className}`}>
      {visibleUsers.map((user, index) => (
        <div
          key={user?.id || user?.username || index}
          className={index > 0 ? spacing : ''}
          style={{ zIndex: visibleUsers.length - index }}
        >
          <SmartAvatar
            user={user}
            size={size}
            showBorder={true}
            borderColor="border-white dark:border-gray-800"
            showTooltip={true}
          />
        </div>
      ))}

      {showRemaining && remainingCount > 0 && (
        <div className={`${spacing} ${sizeConfigs[size]?.container || 'w-10 h-10'} bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// Size configurations for AvatarGroup
const sizeConfigs = {
  xs: { container: 'w-6 h-6' },
  sm: { container: 'w-8 h-8' },
  default: { container: 'w-10 h-10' },
  lg: { container: 'w-12 h-12' },
  xl: { container: 'w-16 h-16' },
  '2xl': { container: 'w-20 h-20' },
  '3xl': { container: 'w-24 h-24' }
};