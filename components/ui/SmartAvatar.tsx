'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, type MouseEventHandler } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl' | '2xl' | '3xl';

interface SizeConfig {
  container: string;
  text: string;
  icon: string;
}


interface ProfilePhoto {
  url?: string | null;
}

export interface SmartAvatarUser {
  id?: string | number;
  name?: string | null;
  username?: string | null;
  image?: string | null;
  picture?: string | null;
  photoURL?: string | null;
  profilePhoto?: ProfilePhoto | null;
}

export interface SmartAvatarProps {
  user?: SmartAvatarUser | null;
  size?: AvatarSize;
  showBorder?: boolean;
  borderColor?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  alt?: string;
  showTooltip?: boolean;
}

const SIZE_CONFIGS: Record<AvatarSize, SizeConfig> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', icon: 'w-3 h-3' },
  sm: { container: 'w-8 h-8', text: 'text-sm', icon: 'w-4 h-4' },
  default: { container: 'w-10 h-10', text: 'text-base', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12', text: 'text-lg', icon: 'w-6 h-6' },
  xl: { container: 'w-16 h-16', text: 'text-xl', icon: 'w-8 h-8' },
  '2xl': { container: 'w-20 h-20', text: 'text-2xl', icon: 'w-10 h-10' },
  '3xl': { container: 'w-24 h-24', text: 'text-3xl', icon: 'w-12 h-12' },
};


const BACKGROUND_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
] as const;

function getInitials(name?: string | null): string {
  if (!name) return 'U';

  const words = name
    .trim()
    .split(' ')
    .filter((word) => word.length > 0);
  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function getBackgroundColor(name?: string | null): string {
  if (!name) return 'bg-fixly-primary';

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return BACKGROUND_COLORS[Math.abs(hash) % BACKGROUND_COLORS.length];
}

function getImageSource(user?: SmartAvatarUser | null): string | null {
  const photoUrl = user?.profilePhoto?.url || user?.image || user?.picture || user?.photoURL;

  if (!photoUrl || photoUrl.includes('/default-avatar') || photoUrl.includes('default.png')) {
    return null;
  }

  return photoUrl;
}

export default function SmartAvatar({
  user,
  size = 'default',
  showBorder = false,
  borderColor = 'border-fixly-border',
  className = '',
  onClick,
  alt,
  showTooltip = false,
}: SmartAvatarProps) {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  const config = SIZE_CONFIGS[size] ?? SIZE_CONFIGS.default;

  useEffect(() => {
    if (user?.image || user?.profilePhoto?.url) {
      setImageLoaded(false);
      setImageError(false);
      setImageLoading(true);
    }
  }, [user?.image, user?.profilePhoto?.url]);

  const imageSource = getImageSource(user);
  const userName = user?.name || user?.username || 'User';
  const initials = getInitials(userName);
  const bgColor = getBackgroundColor(userName);

  const showImage = Boolean(imageSource && imageLoaded && !imageError);
  const showInitials = Boolean(!showImage && userName && initials);
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
      {imageLoading && imageSource && (
        <div className="absolute inset-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      )}

      {imageSource && (
        <Image
          src={imageSource}
          alt={alt || `Profile picture of ${userName}`}
          fill
          sizes="(max-width: 768px) 64px, 128px"
          unoptimized
          className={`
            h-full w-full object-cover
            transition-opacity duration-300
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
            setImageLoading(false);
          }}
          onError={() => {
            setImageLoaded(false);
            setImageError(true);
            setImageLoading(false);
          }}
        />
      )}

      {showInitials && (
        <span className={`${config.text} select-none font-semibold text-white`}>{initials}</span>
      )}

      {showIcon && <User className={`${config.icon} text-white`} />}

      {imageLoading && imageSource && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-20">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}
    </div>
  );

  if (showTooltip && userName) {
    return (
      <div className="group relative">
        {content}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
          {userName}
          <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      </div>
    );
  }

  return content;
}

export { AvatarGroup } from './AvatarGroup';
export type { AvatarGroupProps } from './AvatarGroup';
