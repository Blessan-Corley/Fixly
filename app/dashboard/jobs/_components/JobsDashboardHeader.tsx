'use client';

import { Plus, TrendingUp } from 'lucide-react';

type JobsDashboardHeaderProps = {
  isProUser: boolean;
  onUpgrade: () => void;
  onPostJob: () => void;
};

export function JobsDashboardHeader({
  isProUser,
  onUpgrade,
  onPostJob,
}: JobsDashboardHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8 flex flex-col justify-between lg:flex-row lg:items-center">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-fixly-text">My Jobs</h1>
        <p className="text-fixly-text-light">Manage your job postings and view applications</p>
      </div>

      <div className="mt-4 flex items-center space-x-4 lg:mt-0">
        {!isProUser && (
          <button onClick={onUpgrade} className="btn-secondary flex items-center">
            <TrendingUp className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </button>
        )}
        <button onClick={onPostJob} className="btn-primary flex items-center">
          <Plus className="mr-2 h-4 w-4" />
          Post New Job
        </button>
      </div>
    </div>
  );
}
