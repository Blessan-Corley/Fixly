'use client';

import { MapPin, Star, User } from 'lucide-react';

import type { JobDetails } from './apply.types';
import { formatBudget } from './apply.utils';

type ApplyJobSummaryCardProps = {
  job: JobDetails;
};

export default function ApplyJobSummaryCard({ job }: ApplyJobSummaryCardProps): React.JSX.Element {
  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fixly-text">{job.title}</h2>
          <div className="mt-1 flex items-center text-sm text-fixly-text-light">
            <MapPin className="mr-1 h-4 w-4" />
            <span className="text-fixly-accent">
              Location will be shared after application approval
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-fixly-text-light">Budget</div>
          <div className="font-semibold text-fixly-text">{formatBudget(job.budget)}</div>
        </div>
      </div>

      <div className="flex items-center border-t border-fixly-border pt-4">
        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-fixly-accent-light">
          <User className="h-4 w-4 text-fixly-accent" />
        </div>
        <div>
          <div className="font-medium text-fixly-text">{job.createdBy.name}</div>
          <div className="flex items-center text-sm text-fixly-text-light">
            <Star className="mr-1 h-3 w-3 text-yellow-500" />
            {job.createdBy.rating.average !== null
              ? job.createdBy.rating.average.toFixed(1)
              : 'New'}{' '}
            ({job.createdBy.rating.count} reviews)
          </div>
        </div>
      </div>
    </div>
  );
}
