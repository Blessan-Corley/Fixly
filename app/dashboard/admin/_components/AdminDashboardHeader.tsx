'use client';

import { Loader } from 'lucide-react';

type AdminDashboardHeaderProps = {
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
};

export function AdminDashboardHeader({
  lastUpdated,
  onRefresh,
  isRefreshing,
}: AdminDashboardHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-fixly-text">Admin Dashboard</h1>
        <p className="text-fixly-text-light">Monitor and manage the Fixly platform</p>
        <p className="mt-2 text-xs text-fixly-text-muted">
          Last updated: {lastUpdated || 'Not available'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="btn-secondary flex items-center justify-center"
      >
        {isRefreshing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
        Refresh Metrics
      </button>
    </div>
  );
}
