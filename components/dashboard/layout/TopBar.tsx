'use client';

import { Menu } from 'lucide-react';

import type {
  BadgeStyle,
  DashboardNotification,
  DashboardUser,
  SubscriptionInfo,
} from '@/components/dashboard/layout/layout.types';
import { NotificationBell } from '@/components/dashboard/layout/NotificationBell';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import ThemeToggle from '@/components/ui/ThemeToggle';

type TopBarProps = {
  title: string;
  onMobileMenuClick: () => void;
  isRealTimeConnected: boolean;
  badgeStyle: BadgeStyle;
  notificationDropdownOpen: boolean;
  onNotificationDropdownOpenChange: (open: boolean) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: DashboardNotification) => void;
  onViewAllNotifications: () => void;
  profileDropdownOpen: boolean;
  onProfileDropdownOpenChange: (open: boolean) => void;
  user: DashboardUser | null;
  subscriptionInfo: SubscriptionInfo | null;
  onNavigate: (href: string) => void;
  onRequestSignOut: () => void;
};

export function TopBar({
  title,
  onMobileMenuClick,
  isRealTimeConnected,
  badgeStyle,
  notificationDropdownOpen,
  onNotificationDropdownOpenChange,
  onMarkAllAsRead,
  onNotificationClick,
  onViewAllNotifications,
  profileDropdownOpen,
  onProfileDropdownOpenChange,
  user,
  subscriptionInfo,
  onNavigate,
  onRequestSignOut,
}: TopBarProps) {
  return (
    <header className="navbar relative z-10 px-4 py-4 lg:px-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onMobileMenuClick}
          className="rounded-lg p-2 transition-colors hover:bg-fixly-accent/10 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden lg:block">
          <h1 className="text-xl font-semibold text-fixly-text">{title}</h1>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle variant="dropdown" />

          <NotificationBell
            open={notificationDropdownOpen}
            onOpenChange={onNotificationDropdownOpenChange}
            isRealTimeConnected={isRealTimeConnected}
            badgeStyle={badgeStyle}
            onMarkAllAsRead={onMarkAllAsRead}
            onNotificationClick={onNotificationClick}
            onViewAll={onViewAllNotifications}
          />

          <UserMenu
            open={profileDropdownOpen}
            onOpenChange={onProfileDropdownOpenChange}
            user={user}
            subscriptionInfo={subscriptionInfo}
            onNavigate={onNavigate}
            onRequestSignOut={onRequestSignOut}
          />
        </div>
      </div>
    </header>
  );
}
