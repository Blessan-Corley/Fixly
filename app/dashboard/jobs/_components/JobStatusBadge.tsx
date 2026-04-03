'use client';

import { getStatusColor, getStatusText } from '@/app/dashboard/jobs/_lib/jobs.helpers';
import type { DashboardJob } from '@/app/dashboard/jobs/_lib/jobs.types';

export function JobStatusBadge({ job }: { job: DashboardJob }): React.JSX.Element {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs ${getStatusColor(job.status)}`}>
      {getStatusText(job)}
    </span>
  );
}
