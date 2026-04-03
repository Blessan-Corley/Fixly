'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type AppUser, useApp } from '@/app/providers';
import {
  DEFAULT_NOTIFICATION_COUNTS,
  normalizeBadgeStyle,
  type BadgeStyle,
  type DashboardNotification,
  type NotificationCounts,
  type SubscriptionInfo,
} from '@/components/dashboard/layout/layout.types';
import { useMobileDevice } from '@/components/ui/mobile';
import { useMobileNav, type NavigationItem } from '@/components/ui/mobile-nav.shared';
import { useAbly } from '@/contexts/AblyContext';
import {
  useFixerSubscriptionQuery,
  useHirerSubscriptionQuery,
} from '@/hooks/query/subscription';
import { useRealTimeNotifications } from '@/hooks/realtime/useNotificationCenter';
import { closeAblyClient } from '@/lib/ably';
import { useUIStore } from '@/lib/stores/uiStore';

import { buildNavigationItems } from './layout.navigation';

type UserRole = 'hirer' | 'fixer' | 'admin';

type DashboardPlan = {
  type?: string;
  creditsUsed?: number | string;
};

export type LocalDashboardUser = AppUser & {
  role?: UserRole;
  photoURL?: string | null;
  username?: string;
  name?: string;
  plan?: DashboardPlan;
};

type UseDashboardLayoutResult = {
  user: LocalDashboardUser | null;
  sidebarHovered: boolean;
  setSidebarHovered: (value: boolean) => void;
  isRealTimeConnected: boolean;
  badgeStyle: BadgeStyle;
  notificationDropdownOpen: boolean;
  setNotificationDropdownOpen: (value: boolean) => void;
  profileDropdownOpen: boolean;
  setProfileDropdownOpen: (value: boolean) => void;
  subscriptionInfo: SubscriptionInfo | null;
  navigationItems: NavigationItem[];
  isMobileNavOpen: boolean;
  activeModal: string | null;
  deviceInfo: ReturnType<typeof useMobileDevice>;
  mobileNav: ReturnType<typeof useMobileNav>;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  handleNotificationClick: (notification: DashboardNotification) => Promise<void>;
  handleSignOut: () => Promise<void>;
  markAllNotificationsAsRead: () => Promise<boolean>;
};

export function useDashboardLayout(): UseDashboardLayoutResult {
  const { user } = useApp() as { user: LocalDashboardUser | null };
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const {
    notifications,
    markAsRead,
    markAllAsRead: markAllNotificationsAsRead,
  } = useRealTimeNotifications();
  const { isConnected: isRealTimeConnected } = useAbly();

  const typedNotifications = notifications as DashboardNotification[];
  const router = useRouter();
  const pathname = usePathname();
  const currentPathname = pathname ?? '';

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>(
    DEFAULT_NOTIFICATION_COUNTS
  );
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>('numbers');

  const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
  const toggleMobileNav = useUIStore((state) => state.toggleMobileNav);
  const activeModal = useUIStore((state) => state.activeModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);

  const fixerSubscriptionQuery = useFixerSubscriptionQuery({ enabled: user?.role === 'fixer' });
  const hirerSubscriptionQuery = useHirerSubscriptionQuery({ enabled: user?.role === 'hirer' });

  const subscriptionInfo: SubscriptionInfo | null =
    user?.role === 'fixer'
      ? fixerSubscriptionQuery.data
        ? { isPro: fixerSubscriptionQuery.data.plan.isActive, plan: fixerSubscriptionQuery.data.plan }
        : null
      : user?.role === 'hirer'
        ? hirerSubscriptionQuery.data
          ? { isPro: hirerSubscriptionQuery.data.plan.isActive, plan: hirerSubscriptionQuery.data.plan }
          : null
        : null;

  const deviceInfo = useMobileDevice();
  const mobileNav = useMobileNav();

  const openMobileNav = useCallback((): void => {
    if (!useUIStore.getState().isMobileNavOpen) toggleMobileNav();
  }, [toggleMobileNav]);

  const closeMobileNav = useCallback((): void => {
    if (useUIStore.getState().isMobileNavOpen) toggleMobileNav();
  }, [toggleMobileNav]);

  useEffect(() => {
    const savedBadgeStyle = document.cookie
      .split('; ')
      .find((row) => row.startsWith('badgeStyle='))
      ?.split('=')[1];
    setBadgeStyle(normalizeBadgeStyle(savedBadgeStyle));
  }, []);

  useEffect(() => {
    if (typedNotifications.length === 0) {
      setNotificationCounts(DEFAULT_NOTIFICATION_COUNTS);
      return;
    }

    try {
      const unread = typedNotifications.filter((n) => !n.read);
      setNotificationCounts({
        messages: unread.filter((n) => n.type === 'new_message').length,
        applications: unread.filter(
          (n) =>
            n.type === 'job_applied' ||
            n.type === 'application_accepted' ||
            n.type === 'application_rejected'
        ).length,
        jobs: unread.filter((n) => n.type === 'job_question' || n.type === 'comment_reply').length,
      });
    } catch (error) {
      console.error('Error computing notification counts:', error);
      setNotificationCounts(DEFAULT_NOTIFICATION_COUNTS);
    }
  }, [typedNotifications]);

  const handleNotificationClick = async (notification: DashboardNotification): Promise<void> => {
    if (!notification.read && notification.id) {
      await markAsRead(notification.id);
    }

    const actionUrl =
      (typeof notification.actionUrl === 'string' && notification.actionUrl.trim()
        ? notification.actionUrl
        : null) ||
      (Array.isArray(notification.actions) &&
      notification.actions[0] &&
      typeof notification.actions[0].url === 'string' &&
      notification.actions[0].url.trim()
        ? notification.actions[0].url
        : null);

    if (actionUrl) router.push(actionUrl);
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      closeAblyClient();
      await signOut({ callbackUrl: '/' });
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const navigationItems = buildNavigationItems(
    user,
    currentPathname,
    notificationCounts,
    subscriptionInfo?.plan
  );

  return {
    user,
    sidebarHovered,
    setSidebarHovered,
    isRealTimeConnected,
    badgeStyle,
    notificationDropdownOpen,
    setNotificationDropdownOpen,
    profileDropdownOpen,
    setProfileDropdownOpen,
    subscriptionInfo,
    navigationItems,
    isMobileNavOpen,
    activeModal,
    deviceInfo,
    mobileNav,
    openMobileNav,
    closeMobileNav,
    openModal,
    closeModal,
    handleNotificationClick,
    handleSignOut,
    markAllNotificationsAsRead,
  };
}
