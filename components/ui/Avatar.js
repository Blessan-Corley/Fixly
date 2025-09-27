// components/ui/Avatar.js - Unified Avatar component with fallback
import { useState } from 'react';

const Avatar = ({
  src,
  alt,
  name,
  size = 'md',
  className = '',
  showFallback = true,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Size configurations
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-20 w-20 text-2xl',
    '3xl': 'h-24 w-24 text-3xl'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // Handle image load error
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Generate consistent background color based on name
  const getBackgroundColor = (name) => {
    if (!name) return 'bg-fixly-text-muted';

    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];

    const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };

  const baseClasses = `${sizeClass} rounded-full flex-shrink-0 ${className}`;
  const clickableClasses = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  // Show image if src exists and no error occurred
  const shouldShowImage = src && !imageError && !imageLoading;

  // Show fallback if no src, image failed to load, or showFallback is true
  const shouldShowFallback = !src || imageError || (imageLoading && showFallback);

  return (
    <div className={`relative ${baseClasses} ${clickableClasses}`} onClick={onClick}>
      {/* Image */}
      {src && (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={`${baseClasses} object-cover ${shouldShowImage ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: shouldShowImage ? 'block' : 'none' }}
        />
      )}

      {/* Fallback with initials */}
      {shouldShowFallback && (
        <div
          className={`${baseClasses} ${getBackgroundColor(name || alt)} flex items-center justify-center text-white font-semibold select-none`}
          style={{ display: shouldShowImage ? 'none' : 'flex' }}
        >
          {getInitials(name || alt)}
        </div>
      )}

      {/* Loading indicator */}
      {imageLoading && src && (
        <div className={`${baseClasses} bg-fixly-bg-secondary flex items-center justify-center absolute inset-0`}>
          <div className="animate-pulse bg-fixly-text-muted rounded-full w-1/2 h-1/2"></div>
        </div>
      )}
    </div>
  );
};

export default Avatar;