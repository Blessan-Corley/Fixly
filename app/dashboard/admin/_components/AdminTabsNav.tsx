'use client';

import { TABS } from '@/app/dashboard/admin/_lib/admin.helpers';
import type { AdminTab } from '@/app/dashboard/admin/_lib/admin.types';

type AdminTabsNavProps = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
};

export function AdminTabsNav({
  activeTab,
  onTabChange,
}: AdminTabsNavProps): React.JSX.Element {
  return (
    <div className="border-b border-fixly-border">
      <nav className="flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center border-b-2 px-6 py-4 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-fixly-accent text-fixly-accent'
                : 'border-transparent text-fixly-text-muted hover:text-fixly-text'
            }`}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
