'use client';

import { motion } from 'framer-motion';
import { Filter, Loader, Navigation, Search, X } from 'lucide-react';

import type { BrowseFilters } from './browse-jobs.types';
import { BrowseFiltersPanelAdvanced } from './BrowseFiltersPanelAdvanced';

type BrowseFiltersPanelProps = {
  filters: BrowseFilters;
  showFilters: boolean;
  searchLoading: boolean;
  locationEnabled: boolean;
  paginationTotal: number;
  onFilterChange: <K extends keyof BrowseFilters>(field: K, value: BrowseFilters[K]) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
};

export default function BrowseFiltersPanel({
  filters,
  showFilters,
  searchLoading,
  locationEnabled,
  paginationTotal,
  onFilterChange,
  onToggleFilters,
  onClearFilters,
}: BrowseFiltersPanelProps): React.JSX.Element {
  return (
    <div className="card mb-8">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder="Search jobs by title, description, or location..."
              className="input-field pl-10 pr-10"
            />
            {searchLoading && (
              <Loader className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transform animate-spin text-fixly-accent" />
            )}
          </div>
        </div>

        <button
          onClick={onToggleFilters}
          className="btn-secondary flex items-center lg:w-auto"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-sm font-medium text-fixly-text">Quick filters:</span>

        {locationEnabled && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onFilterChange('sortBy', 'distance');
              onFilterChange('maxDistance', 10);
            }}
            className={`btn-sm ${
              filters.sortBy === 'distance' && filters.maxDistance === 10
                ? 'bg-fixly-accent text-white'
                : 'border border-fixly-border bg-white text-fixly-text hover:border-fixly-accent'
            } flex items-center space-x-2`}
          >
            <Navigation className="h-3 w-3" />
            <span>Jobs Near Me</span>
          </motion.button>
        )}

        {filters.sortBy === 'distance' && filters.maxDistance === 10 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onFilterChange('sortBy', 'newest');
              onFilterChange('maxDistance', null);
            }}
            className="btn-sm flex items-center space-x-1 bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <X className="h-3 w-3" />
            <span>Clear</span>
          </motion.button>
        )}
      </div>

      <BrowseFiltersPanelAdvanced
        filters={filters}
        locationEnabled={locationEnabled}
        paginationTotal={paginationTotal}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        show={showFilters}
      />
    </div>
  );
}
