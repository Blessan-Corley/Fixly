'use client';

import { AdminJobStatusBadge } from '@/app/dashboard/admin/_components/AdminBadges';
import { formatCurrency, formatDate } from '@/app/dashboard/admin/_lib/admin.helpers';
import type { AdminJob } from '@/app/dashboard/admin/_lib/admin.types';

type AdminJobsTabProps = {
  jobs: AdminJob[];
};

export function AdminJobsTab({ jobs }: AdminJobsTabProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-fixly-border">
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Job</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Posted By</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Budget</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Status</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Applications</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Posted</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job._id} className="border-b border-fixly-border hover:bg-fixly-bg">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-fixly-text">{job.title}</div>
                    <div className="text-sm text-fixly-text-muted">
                      {job.location.city}, {job.location.state}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-fixly-text">{job.createdBy.name}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-fixly-text">
                    {job.budget.type === 'negotiable'
                      ? 'Negotiable'
                      : formatCurrency(job.budget.amount ?? 0)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AdminJobStatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 text-sm text-fixly-text">{job.applicationCount}</td>
                <td className="px-4 py-3 text-sm text-fixly-text-muted">
                  {formatDate(job.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
