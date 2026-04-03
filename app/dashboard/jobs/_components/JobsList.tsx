'use client';

import { JobCard } from '@/app/dashboard/jobs/_components/JobCard';
import type { DashboardJob } from '@/app/dashboard/jobs/_lib/jobs.types';

type JobsListProps = {
  jobs: DashboardJob[];
  onView: (jobId: string) => void;
  onEdit: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  onRepost: (job: DashboardJob) => void;
};

export function JobsList({
  jobs,
  onView,
  onEdit,
  onDelete,
  onRepost,
}: JobsListProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      {jobs.map((job, index) => (
        <JobCard
          key={job._id}
          job={job}
          index={index}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onRepost={onRepost}
        />
      ))}
    </div>
  );
}
