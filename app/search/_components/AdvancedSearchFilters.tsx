'use client';

import { motion } from 'framer-motion';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives/Select';

import type { SearchFilters } from '../_lib/search.types';

type AdvancedSearchFiltersProps = {
  filters: SearchFilters;
  onFieldChange: (field: keyof SearchFilters, value: string) => void;
  onClear: () => void;
  onApply: () => void;
};

const ANY_BUDGET_TYPE_VALUE = 'all_budget_types';
const ANY_URGENCY_VALUE = 'all_urgency';
const ANY_DATE_POSTED_VALUE = 'all_dates';

export function AdvancedSearchFilters({
  filters,
  onFieldChange,
  onClear,
  onApply,
}: AdvancedSearchFiltersProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-4 rounded-lg border border-fixly-border bg-fixly-bg p-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-fixly-text">Min Budget (Rs.)</label>
          <input
            type="number"
            value={filters.budgetMin}
            onChange={(e) => onFieldChange('budgetMin', e.target.value)}
            className="input-field"
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fixly-text">Max Budget (Rs.)</label>
          <input
            type="number"
            value={filters.budgetMax}
            onChange={(e) => onFieldChange('budgetMax', e.target.value)}
            className="input-field"
            placeholder="100000"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fixly-text">Budget Type</label>
          <Select
            value={filters.budgetType || ANY_BUDGET_TYPE_VALUE}
            onValueChange={(value) =>
              onFieldChange('budgetType', value === ANY_BUDGET_TYPE_VALUE ? '' : value)
            }
          >
            <SelectTrigger className="input-field text-left" aria-label="Budget type">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_BUDGET_TYPE_VALUE}>Any</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="range">Range</SelectItem>
              <SelectItem value="negotiable">Negotiable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fixly-text">Urgency</label>
          <Select
            value={filters.urgency || ANY_URGENCY_VALUE}
            onValueChange={(value) =>
              onFieldChange('urgency', value === ANY_URGENCY_VALUE ? '' : value)
            }
          >
            <SelectTrigger className="input-field text-left" aria-label="Urgency">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_URGENCY_VALUE}>Any</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fixly-text">Date Posted</label>
          <Select
            value={filters.datePosted || ANY_DATE_POSTED_VALUE}
            onValueChange={(value) =>
              onFieldChange('datePosted', value === ANY_DATE_POSTED_VALUE ? '' : value)
            }
          >
            <SelectTrigger className="input-field text-left" aria-label="Date posted">
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_DATE_POSTED_VALUE}>Any time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end space-x-2">
        <button type="button" onClick={onClear} className="btn-ghost">
          Clear All
        </button>
        <button type="button" onClick={onApply} className="btn-primary">
          Apply Filters
        </button>
      </div>
    </motion.div>
  );
}
