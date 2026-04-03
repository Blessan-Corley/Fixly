import type { AppUser } from '@/app/providers';
import type { NavigationItem } from '@/components/ui/mobile-nav.shared';
import type { SubscriptionPlanView } from '@/hooks/query/subscription';

export type BadgeStyle = 'numbers' | 'dots';
export type UserRole = 'hirer' | 'fixer' | 'admin';

export type DashboardPlan = {
  type?: string;
  creditsUsed?: number | string;
};

export type DashboardUser = AppUser & {
  role?: UserRole;
  photoURL?: string | null;
  username?: string;
  name?: string;
  plan?: DashboardPlan;
};

export type SubscriptionInfo = {
  isPro: boolean;
  plan: SubscriptionPlanView | null;
};

export type NotificationCounts = {
  messages: number;
  applications: number;
  jobs: number;
};

export type NotificationAction = {
  url?: string;
};

export type DashboardNotification = {
  id?: string;
  messageId?: string;
  read?: boolean;
  type?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  actionUrl?: string;
  actions?: NotificationAction[];
};

export type DashboardNavigationItem = NavigationItem;

export const DEFAULT_NOTIFICATION_COUNTS: NotificationCounts = {
  messages: 0,
  applications: 0,
  jobs: 0,
};

export const normalizeBadgeStyle = (value: string | undefined): BadgeStyle =>
  value === 'dots' ? 'dots' : 'numbers';

export const formatRole = (role: string | undefined): string =>
  role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : '';
