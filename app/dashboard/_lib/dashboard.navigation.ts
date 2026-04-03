import {
  Plus,
  Search,
  Briefcase,
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  Activity,
} from 'lucide-react';

import { getCreditsUsed, getJobsPosted, getJobsCompleted } from './dashboard.helpers';
import type { DashboardUser, QuickAction, NextStep, UserRole } from './dashboard.types';

export function getQuickActions(role: UserRole, user: DashboardUser | null): QuickAction[] {
  const creditsUsed = getCreditsUsed(user);
  const jobsPosted = getJobsPosted(user);

  switch (role) {
    case 'hirer':
      return [
        {
          title: 'Post New Job',
          description: 'Create a new job posting',
          icon: Plus,
          href: '/dashboard/post-job',
          color: 'bg-fixly-accent',
          urgent: jobsPosted === 0,
        },
        {
          title: 'Browse Fixers',
          description: 'Find skilled professionals',
          icon: Search,
          href: '/dashboard/find-fixers',
          color: 'bg-blue-500',
        },
        {
          title: 'My Jobs',
          description: 'Manage your job postings',
          icon: Briefcase,
          href: '/dashboard/jobs',
          color: 'bg-green-500',
        },
        {
          title: 'Messages',
          description: 'Chat with fixers',
          icon: MessageSquare,
          href: '/dashboard/messages',
          color: 'bg-fixly-primary',
        },
      ];

    case 'fixer':
      return [
        {
          title: 'Browse Jobs',
          description: 'Find new work opportunities',
          icon: Search,
          href: '/dashboard/browse-jobs',
          color: 'bg-fixly-accent',
          urgent: creditsUsed < 3,
        },
        {
          title: 'My Applications',
          description: 'Track your job applications',
          icon: Briefcase,
          href: '/dashboard/applications',
          color: 'bg-blue-500',
        },
        {
          title: 'Earnings',
          description: 'View your income',
          icon: DollarSign,
          href: '/dashboard/earnings',
          color: 'bg-green-500',
        },
        {
          title: 'Upgrade Plan',
          description: 'Unlock unlimited jobs',
          icon: TrendingUp,
          href: '/dashboard/subscription',
          color: 'bg-orange-500',
          urgent: creditsUsed >= 3,
        },
      ];

    case 'admin':
      return [
        {
          title: 'User Management',
          description: 'Manage platform users',
          icon: Users,
          href: '/dashboard/admin/users',
          color: 'bg-fixly-accent',
        },
        {
          title: 'Job Management',
          description: 'Oversee all jobs',
          icon: Briefcase,
          href: '/dashboard/admin/jobs',
          color: 'bg-blue-500',
        },
        {
          title: 'Analytics',
          description: 'Platform insights',
          icon: TrendingUp,
          href: '/dashboard/admin/analytics',
          color: 'bg-green-500',
        },
        {
          title: 'Reports',
          description: 'System reports',
          icon: Activity,
          href: '/dashboard/admin/reports',
          color: 'bg-fixly-primary',
        },
      ];

    default:
      return [];
  }
}

export function getNextSteps(user: DashboardUser | null): NextStep {
  const jobsPosted = getJobsPosted(user);
  const jobsCompleted = getJobsCompleted(user);
  const creditsUsed = getCreditsUsed(user);

  switch (user?.role) {
    case 'hirer':
      if (jobsPosted === 0) {
        return {
          title: 'Get Started',
          description: 'Post your first job to find skilled professionals',
          action: 'Post a Job',
          href: '/dashboard/post-job',
          icon: Plus,
        };
      }
      return {
        title: 'Keep Growing',
        description: 'Continue finding great fixers for your projects',
        action: 'Browse Fixers',
        href: '/dashboard/find-fixers',
        icon: Search,
      };

    case 'fixer':
      if (jobsCompleted === 0) {
        return {
          title: 'Start Earning',
          description: 'Apply to jobs and start building your reputation',
          action: 'Browse Jobs',
          href: '/dashboard/browse-jobs',
          icon: Search,
        };
      }
      if (creditsUsed >= 3) {
        return {
          title: 'Upgrade Your Plan',
          description: 'Get unlimited job applications with Pro',
          action: 'Upgrade Now',
          href: '/dashboard/subscription',
          icon: TrendingUp,
        };
      }
      return {
        title: 'Keep Working',
        description: 'Continue building your portfolio and earning',
        action: 'Find More Jobs',
        href: '/dashboard/browse-jobs',
        icon: Search,
      };

    default:
      return null;
  }
}
