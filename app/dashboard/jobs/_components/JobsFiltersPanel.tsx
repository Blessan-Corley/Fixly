'use client';

import { Filter, Search } from 'lucide-react';

import { asTabStatus } from '@/app/dashboard/jobs/_lib/jobs.helpers';
import type { FilterState, TabStatus } from '@/app/dashboard/jobs/_lib/jobs.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives/Select';

type JobsFiltersPanelProps = {
  filters: FilterState;
  showFilters: boolean;
  activeFilterCount: number;
  total: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: TabStatus) => void;
  onToggleFilters: () => void;
  onClear: () => void;
};

export function JobsFiltersPanel({
  filters,
  showFilters,
  activeFilterCount,
  total,
  onSearchChange,
  onStatusChange,
  onToggleFilters,
  onClear,
}: JobsFiltersPanelProps): React.JSX.Element {
  return (
    <div className="card mb-8">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search jobs by title or description..."
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Select value={filters.status} onValueChange={(value) => onStatusChange(asTabStatus(value))}>
            <SelectTrigger className="select-field" aria-label="Job status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <button onClick={onToggleFilters} className="btn-secondary flex items-center lg:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 flex flex-col gap-3 border-t border-fixly-border pt-4 text-sm md:flex-row md:items-center md:justify-between">
          <div className="text-fixly-text-muted">
            {activeFilterCount > 0
              ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`
              : 'No active filters'}
          </div>
          <button onClick={onClear} className="btn-ghost w-fit text-sm">
            Clear filters
          </button>
        </div>
      )}

      <div className="text-sm text-fixly-text-muted">{total} jobs found</div>
    </div>
  );
}
