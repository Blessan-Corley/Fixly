'use client';

import { TrendingUp } from 'lucide-react';

import { formatCurrency } from '@/app/dashboard/admin/_lib/admin.helpers';
import type { AdminStats } from '@/app/dashboard/admin/_lib/admin.types';

type AdminReportsTabProps = {
  stats: AdminStats;
};

export function AdminReportsTab({ stats }: AdminReportsTabProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <h4 className="mb-3 font-medium text-fixly-text">Total Users</h4>
          <div className="mb-1 text-2xl font-bold text-fixly-text">{stats.totalUsers}</div>
          <div className="text-sm text-fixly-text-muted">Registered non-admin accounts</div>
        </div>

        <div className="card">
          <h4 className="mb-3 font-medium text-fixly-text">Completed Jobs</h4>
          <div className="mb-1 text-2xl font-bold text-fixly-text">{stats.completedJobs}</div>
          <div className="text-sm text-fixly-text-muted">Completed marketplace jobs</div>
        </div>

        <div className="card">
          <h4 className="mb-3 font-medium text-fixly-text">Dispute Load</h4>
          <div className="mb-1 text-2xl font-bold text-fixly-text">{stats.totalDisputes}</div>
          <div className="text-sm text-fixly-text-muted">Open disputes requiring review</div>
        </div>

        <div className="card">
          <h4 className="mb-3 font-medium text-fixly-text">Active Subscriptions</h4>
          <div className="mb-1 text-2xl font-bold text-fixly-text">
            {stats.activeSubscriptions}
          </div>
          <div className="text-sm text-fixly-text-muted">
            Estimated revenue {formatCurrency(stats.estimatedRevenue)}
          </div>
        </div>
      </div>

      <div className="py-8 text-center">
        <TrendingUp className="mx-auto mb-3 h-12 w-12 text-fixly-text-muted" />
        <p className="text-fixly-text-muted">Detailed analytics and reports coming soon...</p>
      </div>
    </div>
  );
}
