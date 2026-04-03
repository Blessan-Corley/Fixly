'use client';

import { ChevronDown, LogOut, Settings, Star, User } from 'lucide-react';

import type { DashboardUser, SubscriptionInfo } from '@/components/dashboard/layout/layout.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/primitives/DropdownMenu';
import ProBadge from '@/components/ui/ProBadge';
import SmartAvatar from '@/components/ui/SmartAvatar';

type UserMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DashboardUser | null;
  subscriptionInfo: SubscriptionInfo | null;
  onNavigate: (href: string) => void;
  onRequestSignOut: () => void;
};

export function UserMenu({
  open,
  onOpenChange,
  user,
  subscriptionInfo,
  onNavigate,
  onRequestSignOut,
}: UserMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <div className="profile-dropdown relative">
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 rounded-lg p-2 transition-colors hover:bg-fixly-accent/10">
            <SmartAvatar
              user={{
                ...user,
                image: user?.photoURL,
                profilePhoto: { url: user?.photoURL },
              }}
              size="sm"
              showBorder={false}
            />
            <ChevronDown className="h-4 w-4 text-fixly-text-muted" />
          </button>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-48 rounded-lg border border-fixly-border bg-fixly-card p-0 shadow-fixly-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div className="border-b border-fixly-border p-4">
          <p className="flex items-center truncate font-medium text-fixly-text">
            {user?.name}
            <ProBadge isPro={subscriptionInfo?.isPro} size="xs" />
          </p>
          <p className="truncate text-sm text-fixly-text-muted">@{user?.username}</p>
        </div>
        <div className="py-2">
          <DropdownMenuItem
            onSelect={() => {
              onNavigate('/dashboard/profile');
              onOpenChange(false);
            }}
            className="cursor-pointer rounded-none px-4 py-2 focus:bg-fixly-accent/10"
          >
            <User className="mr-3 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              onNavigate('/dashboard/settings');
              onOpenChange(false);
            }}
            className="cursor-pointer rounded-none px-4 py-2 focus:bg-fixly-accent/10"
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          {user?.role === 'fixer' && (
            <DropdownMenuItem
              onSelect={() => {
                onNavigate('/dashboard/subscription');
                onOpenChange(false);
              }}
              className="cursor-pointer rounded-none px-4 py-2 focus:bg-fixly-accent/10"
            >
              <Star className="mr-3 h-4 w-4" />
              Upgrade to Pro
            </DropdownMenuItem>
          )}
        </div>
        <div className="border-t border-fixly-border py-2">
          <DropdownMenuItem
            onSelect={() => {
              onRequestSignOut();
              onOpenChange(false);
            }}
            className="cursor-pointer rounded-none px-4 py-2 text-red-600 focus:bg-red-50 focus:text-red-600"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
