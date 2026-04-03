'use client';

import SmartAvatar from '@/components/ui/SmartAvatar';

import type { PresenceUser } from '../_lib/types';

type PresenceBarProps = {
  presenceUsers: PresenceUser[];
  currentUserId: string;
};

export function PresenceBar({
  presenceUsers,
  currentUserId,
}: PresenceBarProps): React.JSX.Element | null {
  const otherUsers = presenceUsers.filter((user) => user.id !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-b border-fixly-border bg-fixly-bg px-4 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-fixly-text-light">
        In conversation
      </span>
      <div className="flex items-center gap-2">
        {otherUsers.map((user) => (
          <div key={user.id} className="flex items-center gap-2 rounded-full bg-fixly-card px-2 py-1">
            <SmartAvatar
              user={{
                name: user.name,
                image: user.avatar,
              }}
              size="xs"
              className="h-6 w-6"
            />
            <span className="text-xs text-fixly-text">{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
