'use client';

import Image from 'next/image';

import {
  AdminJobStatusBadge,
  AdminRoleBadge,
  AdminStatusBadge,
} from '@/app/dashboard/admin/_components/AdminBadges';
import AdminEnvironmentHealthPanel from '@/app/dashboard/admin/_components/AdminEnvironmentHealthPanel';
import { formatCurrency } from '@/app/dashboard/admin/_lib/admin.helpers';
import type { AdminJob, AdminUser, EnvHealthVariable } from '@/app/dashboard/admin/_lib/admin.types';

type AdminOverviewTabProps = {
  showEnvHealth: boolean;
  healthScore: number;
  envHealthVariables: EnvHealthVariable[];
  envHealthLoading: boolean;
  onToggleEnvHealth: () => void;
  users: AdminUser[];
  recentJobs: AdminJob[];
};

export function AdminOverviewTab({
  showEnvHealth,
  healthScore,
  envHealthVariables,
  envHealthLoading,
  onToggleEnvHealth,
  users,
  recentJobs,
}: AdminOverviewTabProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <AdminEnvironmentHealthPanel
        show={showEnvHealth}
        healthScore={healthScore}
        variables={envHealthVariables}
        isLoading={envHealthLoading}
        onToggle={onToggleEnvHealth}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 font-semibold text-fixly-text">Recent Users</h3>
          <div className="space-y-3">
            {users.slice(0, 5).map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between rounded-lg bg-fixly-bg p-3"
              >
                <div className="flex items-center">
                  <Image
                    src={user.profilePhoto || '/default-avatar.png'}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="mr-3 h-8 w-8 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium text-fixly-text">{user.name}</div>
                    <div className="text-sm text-fixly-text-muted">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <AdminRoleBadge role={user.role} />
                  <AdminStatusBadge status={user.banned ? 'banned' : 'active'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-semibold text-fixly-text">Recent Jobs</h3>
          <div className="space-y-3">
            {recentJobs.slice(0, 5).map((job) => (
              <div key={job._id} className="rounded-lg bg-fixly-bg p-3">
                <div className="mb-1 font-medium text-fixly-text">{job.title}</div>
                <div className="mb-2 text-sm text-fixly-text-muted">
                  {job.location.city} -{' '}
                  {job.budget.amount == null ? 'Negotiable' : formatCurrency(job.budget.amount)}
                </div>
                <div className="flex items-center justify-between">
                  <AdminJobStatusBadge status={job.status} />
                  <span className="text-xs text-fixly-text-muted">
                    {job.applicationCount} applications
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
