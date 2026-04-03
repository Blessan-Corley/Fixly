'use client';

import { Briefcase, Calendar, DollarSign, MapPin } from 'lucide-react';

import type { JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

type JobSummaryCardProps = {
  job: Pick<JobDetails, 'title' | 'budget' | 'location' | 'deadline'>;
};

export default function JobSummaryCard({ job }: JobSummaryCardProps) {
  return (
    <div className="rounded-xl border border-fixly-accent/20 bg-gradient-to-r from-fixly-accent-bg to-fixly-primary-bg p-5">
      <h3 className="mb-3 flex items-center font-semibold text-fixly-text">
        <Briefcase className="mr-2 h-5 w-5 text-fixly-accent" />
        {job.title}
      </h3>
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="flex items-center text-fixly-text-muted">
          <DollarSign className="mr-2 h-4 w-4 text-fixly-accent" />
          <span className="font-medium">Budget:</span>
          <span className="ml-1">
            {job.budget.type === 'negotiable'
              ? 'Negotiable'
              : `Rs ${job.budget.amount?.toLocaleString()}`}
          </span>
        </div>
        <div className="flex items-center text-fixly-text-muted">
          <MapPin className="mr-2 h-4 w-4 text-fixly-accent" />
          <span className="font-medium">Location:</span>
          <span className="ml-1">
            {job.location.city}, {job.location.state}
          </span>
        </div>
        <div className="flex items-center text-fixly-text-muted">
          <Calendar className="mr-2 h-4 w-4 text-fixly-accent" />
          <span className="font-medium">Deadline:</span>
          <span className="ml-1">
            {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Not set'}
          </span>
        </div>
      </div>
    </div>
  );
}
