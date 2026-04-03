'use client';

import { Search } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/primitives/Select';

import type { FilterState } from './applications.types';

type ApplicationFilterBarProps = {
  filters: FilterState;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export default function ApplicationFilterBar({
  filters,
  onSearchChange,
  onStatusChange,
}: ApplicationFilterBarProps) {
  return (
    <div className="card mb-8">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search applications..."
              className="input-field pl-10"
            />
          </div>
        </div>

        <Select value={filters.status} onValueChange={onStatusChange}>
          <SelectTrigger className="select-field" aria-label="Application status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
