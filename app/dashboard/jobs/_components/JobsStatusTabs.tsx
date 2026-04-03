'use client';

import type { TabStatus } from '@/app/dashboard/jobs/_lib/jobs.types';

type JobsStatusTabsProps = {
  activeTab: TabStatus;
  tabCounts: Record<TabStatus, number>;
  onTabChange: (tab: TabStatus) => void;
};

const TABS: Array<{ key: TabStatus; label: string }> = [
  { key: 'all', label: 'All Jobs' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function JobsStatusTabs({
  activeTab,
  tabCounts,
  onTabChange,
}: JobsStatusTabsProps): React.JSX.Element {
  return (
    <div className="card mb-8">
      <div className="mb-6 flex space-x-1 rounded-lg bg-fixly-bg p-1">
        {TABS.map((tab) => {
          const count = tabCounts[tab.key];

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-fixly-accent shadow-sm'
                  : 'text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-2 rounded-full bg-fixly-accent px-2 py-0.5 text-xs text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
