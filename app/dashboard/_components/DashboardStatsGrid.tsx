'use client';

import { Briefcase, CheckCircle, Clock, DollarSign, Users, TrendingUp, Star } from 'lucide-react';

import { MobileCard } from '../../../components/ui/mobile';
import type { MobileCardProps } from '../../../components/ui/mobile/MobileCard';
import { formatCurrency, toFiniteNumber, getJobsCompleted, getTotalEarnings } from '../_lib/dashboard.helpers';
import type { DashboardCardViewProps, DashboardStats, DashboardUser } from '../_lib/dashboard.types';

type DashboardStatsGridProps = {
  stats: DashboardStats;
  user: DashboardUser | null;
  pageLoading: boolean;
  isMobile: boolean;
};

function DesktopDashboardCard({ children, className, hover = true }: DashboardCardViewProps) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className ?? ''}`}>{children}</div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card">
          <div className="animate-pulse">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-lg bg-fixly-border"></div>
              <div className="ml-4 flex-1">
                <div className="mb-2 h-6 rounded bg-fixly-border"></div>
                <div className="h-4 w-3/4 rounded bg-fixly-border"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HirerStats({
  stats,
  isMobile,
}: {
  stats: DashboardStats;
  isMobile: boolean;
}) {
  const DashboardCard: (props: MobileCardProps) => JSX.Element = isMobile
    ? MobileCard
    : DesktopDashboardCard;

  return (
    <div
      className={`grid ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} mb-8 gap-6`}
    >
      <DashboardCard hover={!isMobile}>
        <div className="flex items-center">
          <div className="rounded-lg bg-fixly-accent/10 p-3">
            <Briefcase className="h-6 w-6 text-fixly-accent" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.totalJobs || 0}</div>
            <div className="text-sm text-fixly-text-muted">Total Jobs Posted</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard hover={!isMobile}>
        <div className="flex items-center">
          <div className="rounded-lg bg-green-100 p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.completedJobs || 0}</div>
            <div className="text-sm text-fixly-text-muted">Completed Jobs</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard hover={!isMobile}>
        <div className="flex items-center">
          <div className="rounded-lg bg-orange-100 p-3">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.activeJobs || 0}</div>
            <div className="text-sm text-fixly-text-muted">Active Jobs</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard hover={!isMobile}>
        <div className="flex items-center">
          <div className="rounded-lg bg-blue-100 p-3">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {formatCurrency(stats.totalSpent)}
            </div>
            <div className="text-sm text-fixly-text-muted">Total Spent</div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

function FixerStats({
  stats,
  user,
}: {
  stats: DashboardStats;
  user: DashboardUser | null;
}) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-fixly-accent/10 p-3">
            <Briefcase className="h-6 w-6 text-fixly-accent" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats.totalApplications || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Applications Sent</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-green-100 p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{getJobsCompleted(user)}</div>
            <div className="text-sm text-fixly-text-muted">Jobs Completed</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-yellow-100 p-3">
            <Star className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {toFiniteNumber(user?.rating?.average).toFixed(1)}
            </div>
            <div className="text-sm text-fixly-text-muted">
              Rating ({toFiniteNumber(user?.rating?.count)} reviews)
            </div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-blue-100 p-3">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {formatCurrency(getTotalEarnings(user))}
            </div>
            <div className="text-sm text-fixly-text-muted">Total Earnings</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-fixly-accent/10 p-3">
            <Users className="h-6 w-6 text-fixly-accent" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.totalUsers}</div>
            <div className="text-sm text-fixly-text-muted">Total Users</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-green-100 p-3">
            <Briefcase className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.totalJobs}</div>
            <div className="text-sm text-fixly-text-muted">Total Jobs</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-blue-100 p-3">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.activeUsers}</div>
            <div className="text-sm text-fixly-text-muted">Active Users</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="rounded-lg bg-fixly-accent/20 p-3">
            <DollarSign className="h-6 w-6 text-fixly-primary" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {formatCurrency(stats.revenue)}
            </div>
            <div className="text-sm text-fixly-text-muted">Platform Revenue</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardStatsGrid({
  stats,
  user,
  pageLoading,
  isMobile,
}: DashboardStatsGridProps) {
  if (pageLoading) {
    return <LoadingSkeleton />;
  }

  switch (user?.role) {
    case 'hirer':
      return <HirerStats stats={stats} isMobile={isMobile} />;
    case 'fixer':
      return <FixerStats stats={stats} user={user} />;
    case 'admin':
      return <AdminStats stats={stats} />;
    default:
      return null;
  }
}
