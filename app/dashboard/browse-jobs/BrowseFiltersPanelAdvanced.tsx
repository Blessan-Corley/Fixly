'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Navigation } from 'lucide-react';

import { DISTANCE_RANGES } from '../../../utils/locationUtils';

import type { BrowseFilters, DeadlineFilter, JobSortBy } from './browse-jobs.types';

type AdvancedFiltersProps = {
  filters: BrowseFilters;
  locationEnabled: boolean;
  paginationTotal: number;
  onFilterChange: <K extends keyof BrowseFilters>(field: K, value: BrowseFilters[K]) => void;
  onClearFilters: () => void;
  show: boolean;
};

export function BrowseFiltersPanelAdvanced({
  filters,
  locationEnabled,
  paginationTotal,
  onFilterChange,
  onClearFilters,
  show,
}: AdvancedFiltersProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-fixly-border pt-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => onFilterChange('location', e.target.value)}
                placeholder="City or state"
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Budget Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.budgetMin}
                  onChange={(e) => onFilterChange('budgetMin', e.target.value)}
                  placeholder="Min"
                  className="input-field"
                />
                <input
                  type="number"
                  value={filters.budgetMax}
                  onChange={(e) => onFilterChange('budgetMax', e.target.value)}
                  placeholder="Max"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Urgency</label>
              <select
                value={filters.urgency}
                onChange={(e) => onFilterChange('urgency', e.target.value)}
                className="select-field"
              >
                <option value="">All</option>
                <option value="asap">ASAP</option>
                <option value="flexible">Flexible</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                <span className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  Deadline
                </span>
              </label>
              <select
                value={filters.deadlineFilter}
                onChange={(e) =>
                  onFilterChange('deadlineFilter', e.target.value as DeadlineFilter)
                }
                className="select-field"
              >
                <option value="">All deadlines</option>
                <option value="today">Due today</option>
                <option value="tomorrow">Due tomorrow</option>
                <option value="week">Within a week</option>
                <option value="month">Within a month</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {filters.deadlineFilter === 'custom' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-fixly-text">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.customDeadlineStart}
                    onChange={(e) => onFilterChange('customDeadlineStart', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-fixly-text">To Date</label>
                  <input
                    type="date"
                    value={filters.customDeadlineEnd}
                    onChange={(e) => onFilterChange('customDeadlineEnd', e.target.value)}
                    className="input-field"
                  />
                </div>
              </>
            )}

            {locationEnabled && (
              <div>
                <label className="mb-2 block text-sm font-medium text-fixly-text">
                  <span className="flex items-center">
                    Distance Range
                    <span className="ml-1 text-xs text-green-600">(GPS enabled)</span>
                  </span>
                </label>
                <select
                  value={filters.maxDistance ?? ''}
                  onChange={(e) =>
                    onFilterChange(
                      'maxDistance',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="select-field"
                >
                  <option value="">Any distance</option>
                  {DISTANCE_RANGES.slice(0, -1).map((range) => (
                    <option key={String(range.value)} value={String(range.value)}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Sort By
                {locationEnabled && filters.sortBy === 'distance' && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    <Navigation className="mr-1 h-3 w-3" />
                    GPS Active
                  </span>
                )}
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange('sortBy', e.target.value as JobSortBy)}
                className={`select-field ${filters.sortBy === 'distance' ? 'ring-2 ring-fixly-accent ring-opacity-50' : ''}`}
              >
                <option value="newest">Newest First</option>
                <option value="deadline">By Deadline</option>
                <option value="budget_high">Highest Budget</option>
                <option value="budget_low">Lowest Budget</option>
                <option value="distance" disabled={!locationEnabled}>
                  {locationEnabled ? 'Nearest to Me' : 'Nearest to Me (Enable Location)'}
                </option>
              </select>
              {filters.sortBy === 'distance' && locationEnabled && (
                <p className="mt-1 flex items-center text-xs text-green-600">
                  <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                  Sorting by distance from your location
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={onClearFilters}
              className="text-sm text-fixly-accent hover:text-fixly-accent-dark"
            >
              Clear all filters
            </button>
            <div className="text-sm text-fixly-text-muted">{paginationTotal} jobs found</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
