import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AppUser } from '@/app/providers';

export type UserRole = 'hirer' | 'fixer' | 'admin';
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'draft';

export type DashboardStats = {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  totalSpent: number;
  totalApplications: number;
  totalUsers: number;
  activeUsers: number;
  revenue: number;
};

export type RecentJob = {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  status: JobStatus;
  location: {
    city: string;
  };
  budget: {
    amount: number;
  } | null;
};

export type QuickAction = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  urgent?: boolean;
};

export type NextStep = {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: LucideIcon;
} | null;

export type DashboardUser = AppUser & {
  role?: UserRole;
  jobsPosted?: number;
  jobsCompleted?: number;
  availableNow?: boolean;
  totalEarnings?: number;
  rating?: {
    average?: number;
    count?: number;
  };
  plan?: {
    creditsUsed?: number;
    type?: string;
  };
};

export type DashboardCardViewProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};
