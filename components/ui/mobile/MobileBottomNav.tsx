'use client';

import type { LucideIcon } from 'lucide-react';

export interface MobileBottomNavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: number | string | null;
}

export interface MobileBottomNavProps {
  activeTab: string;
  tabs: MobileBottomNavTab[];
  className?: string;
}

export function MobileBottomNav({ activeTab, tabs, className = '' }: MobileBottomNavProps) {
  return (
    <div
      className={`safe-area-pb fixed bottom-0 left-0 right-0 z-40 border-t border-fixly-border bg-fixly-bg ${className}`}
    >
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`relative flex flex-col items-center rounded-lg px-3 py-2 transition-all ${
                activeTab === tab.id
                  ? 'text-fixly-accent'
                  : 'text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              <TabIcon className="mb-1 h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.badge ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
