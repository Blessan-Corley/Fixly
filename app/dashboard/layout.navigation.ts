import {
  Activity,
  Award,
  Bell,
  Bookmark,
  Briefcase,
  DollarSign,
  Home,
  MessageSquare,
  Plus,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react';

import type { NotificationCounts } from '@/components/dashboard/layout/layout.types';
import type { NavigationItem } from '@/components/ui/mobile-nav.shared';
import type { SubscriptionPlanView } from '@/hooks/query/subscription';

type UserRole = 'hirer' | 'fixer' | 'admin';

type NavUser = {
  role?: UserRole;
} | null;

function buildCommonItems(
  currentPathname: string,
  notificationCounts: NotificationCounts
): NavigationItem[] {
  return [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: currentPathname === '/dashboard',
    },
    {
      name: 'Messages',
      href: '/dashboard/messages',
      icon: MessageSquare,
      current: currentPathname.startsWith('/dashboard/messages'),
      count: Number(notificationCounts.messages) || 0,
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: User,
      current: currentPathname.startsWith('/dashboard/profile'),
    },
  ];
}

function buildNotificationsItem(currentPathname: string): NavigationItem {
  return {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    current: currentPathname.startsWith('/dashboard/notifications'),
  };
}

function buildHirerItems(
  currentPathname: string,
  notificationCounts: NotificationCounts,
  commonItems: NavigationItem[]
): NavigationItem[] {
  return [
    ...commonItems.slice(0, 1),
    {
      name: 'Post Job',
      href: '/dashboard/post-job',
      icon: Plus,
      current: currentPathname === '/dashboard/post-job',
      highlight: true,
    },
    {
      name: 'My Jobs',
      href: '/dashboard/jobs',
      icon: Briefcase,
      current: currentPathname.startsWith('/dashboard/jobs'),
      count: Number(notificationCounts.jobs) || 0,
    },
    {
      name: 'Find Fixers',
      href: '/dashboard/find-fixers',
      icon: Search,
      current: currentPathname.startsWith('/dashboard/find-fixers'),
    },
    ...commonItems.slice(1),
  ];
}

function buildFixerItems(
  currentPathname: string,
  notificationCounts: NotificationCounts,
  commonItems: NavigationItem[],
  plan: SubscriptionPlanView | null | undefined
): NavigationItem[] {
  return [
    ...commonItems.slice(0, 1),
    {
      name: 'Browse Jobs',
      href: '/dashboard/browse-jobs',
      icon: Search,
      current: currentPathname.startsWith('/dashboard/browse-jobs'),
      highlight: true,
    },
    {
      name: 'My Applications',
      href: '/dashboard/applications',
      icon: Briefcase,
      current: currentPathname.startsWith('/dashboard/applications'),
      count: Number(notificationCounts.applications) || 0,
    },
    {
      name: 'Saved Jobs',
      href: '/dashboard/saved-jobs',
      icon: Bookmark,
      current: currentPathname.startsWith('/dashboard/saved-jobs'),
    },
    {
      name: 'Earnings',
      href: '/dashboard/earnings',
      icon: DollarSign,
      current: currentPathname.startsWith('/dashboard/earnings'),
    },
    {
      name: 'Subscription',
      href: '/dashboard/subscription',
      icon: Award,
      current: currentPathname.startsWith('/dashboard/subscription'),
      badge: plan?.type === 'free' ? 'Upgrade' : undefined,
    },
    ...commonItems.slice(1),
    buildNotificationsItem(currentPathname),
  ];
}

function buildAdminItems(
  currentPathname: string,
  commonItems: NavigationItem[]
): NavigationItem[] {
  return [
    ...commonItems.slice(0, 1),
    {
      name: 'Users',
      href: '/dashboard/admin/users',
      icon: Users,
      current: currentPathname.startsWith('/dashboard/admin/users'),
    },
    {
      name: 'Jobs',
      href: '/dashboard/admin/jobs',
      icon: Briefcase,
      current: currentPathname.startsWith('/dashboard/admin/jobs'),
    },
    {
      name: 'Analytics',
      href: '/dashboard/admin/analytics',
      icon: Activity,
      current: currentPathname.startsWith('/dashboard/admin/analytics'),
    },
    {
      name: 'Reports',
      href: '/dashboard/admin/reports',
      icon: Shield,
      current: currentPathname.startsWith('/dashboard/admin/reports'),
    },
    ...commonItems.slice(1),
    buildNotificationsItem(currentPathname),
  ];
}

export function buildNavigationItems(
  user: NavUser,
  currentPathname: string,
  notificationCounts: NotificationCounts,
  plan: SubscriptionPlanView | null | undefined
): NavigationItem[] {
  const commonItems = buildCommonItems(currentPathname, notificationCounts);

  if (user?.role === 'hirer') return buildHirerItems(currentPathname, notificationCounts, commonItems);
  if (user?.role === 'fixer') return buildFixerItems(currentPathname, notificationCounts, commonItems, plan);
  if (user?.role === 'admin') return buildAdminItems(currentPathname, commonItems);

  return [...commonItems, buildNotificationsItem(currentPathname)];
}
