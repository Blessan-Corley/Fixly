'use client';

import type { AvatarSize, SmartAvatarUser } from './SmartAvatar';
import SmartAvatar from './SmartAvatar';

interface AvatarGroupSizeConfig {
  container: string;
}

const GROUP_SIZE_CONFIGS: Record<AvatarSize, AvatarGroupSizeConfig> = {
  xs: { container: 'w-6 h-6' },
  sm: { container: 'w-8 h-8' },
  default: { container: 'w-10 h-10' },
  lg: { container: 'w-12 h-12' },
  xl: { container: 'w-16 h-16' },
  '2xl': { container: 'w-20 h-20' },
  '3xl': { container: 'w-24 h-24' },
};

export interface AvatarGroupProps {
  users?: Array<SmartAvatarUser | null | undefined>;
  max?: number;
  size?: AvatarSize;
  showRemaining?: boolean;
  className?: string;
  spacing?: string;
}

export function AvatarGroup({
  users = [],
  max = 3,
  size = 'default',
  showRemaining = true,
  className = '',
  spacing = '-ml-2',
}: AvatarGroupProps): React.JSX.Element {
  const visibleUsers = users.slice(0, max);
  const remainingCount = Math.max(0, users.length - max);

  return (
    <div className={`flex items-center ${className}`}>
      {visibleUsers.map((user, index) => (
        <div
          key={String(user?.id ?? user?.username ?? index)}
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
        <div
          className={`${spacing} ${GROUP_SIZE_CONFIGS[size]?.container ?? 'h-10 w-10'} flex items-center justify-center rounded-full border-2 border-white bg-gray-100 text-sm font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
