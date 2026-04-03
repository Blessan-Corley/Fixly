'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/primitives/Select';

import type { CategoryStats, Filters, NotificationCategory } from './notifications.types';
import { TAB_OPTIONS, TYPE_OPTIONS } from './notifications.types';
import { toFiniteNumber } from './notifications.utils';

type NotificationsFilterBarProps = {
  filters: Filters;
  activeTab: NotificationCategory;
  categoryStats: CategoryStats;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTabChange: (tab: NotificationCategory) => void;
};

export default function NotificationsFilterBar({
  filters,
  activeTab,
  categoryStats,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onTabChange,
}: NotificationsFilterBarProps) {
  return (
    <div className="card mb-8">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={onSearchChange}
              placeholder="Search notifications..."
              className="input-field pl-10"
            />
          </div>
        </div>

        <Select value={filters.type} onValueChange={onTypeChange}>
          <SelectTrigger className="select-field" aria-label="Notification type">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={onStatusChange}>
          <SelectTrigger className="select-field" aria-label="Read status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TAB_OPTIONS.map((tab) => {
          const count = toFiniteNumber(categoryStats[tab.id]);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'border-fixly-accent/40 bg-fixly-accent/10 text-fixly-primary'
                  : 'border-fixly-border bg-transparent text-fixly-text-muted hover:bg-fixly-bg'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
