'use client';

import { motion } from 'framer-motion';
import { Filter, Loader, Search } from 'lucide-react';

import type { SearchFilters, SortBy } from './find-fixers.types';

type FindFixersFiltersPanelProps = {
  filters: SearchFilters;
  showFilters: boolean;
  searching: boolean;
  skillOptions: string[];
  onFilterChange: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  onSkillToggle: (skill: string) => void;
  onSearch: () => void;
  onToggleFilters: () => void;
};

export default function FindFixersFiltersPanel({
  filters,
  showFilters,
  searching,
  skillOptions,
  onFilterChange,
  onSkillToggle,
  onSearch,
  onToggleFilters,
}: FindFixersFiltersPanelProps) {
  return (
    <div className="card mb-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder="Search fixers by name, skills, or location..."
              className="input-field pl-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSearch();
                }
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSearch}
            disabled={searching}
            className="btn-primary flex items-center"
          >
            {searching ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search
          </button>

          <button onClick={onToggleFilters} className="btn-secondary flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-fixly-border pt-6"
        >
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => onFilterChange('location', e.target.value)}
                placeholder="City, State"
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Min Rating</label>
              <select
                value={filters.minRating}
                onChange={(e) => onFilterChange('minRating', e.target.value)}
                className="select-field"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.8">4.8+ Stars</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Availability
              </label>
              <select
                value={filters.availability}
                onChange={(e) => onFilterChange('availability', e.target.value)}
                className="select-field"
              >
                <option value="">Any Time</option>
                <option value="available">Available Now</option>
                <option value="this_week">This Week</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange('sortBy', e.target.value as SortBy)}
                className="select-field"
              >
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviews</option>
                <option value="recent">Recently Active</option>
                <option value="distance">Nearest</option>
              </select>
            </div>
          </div>

          {/* Skills Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">Skills</label>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  onClick={() => onSkillToggle(skill)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filters.skills.includes(skill)
                      ? 'bg-fixly-accent text-white'
                      : 'border border-fixly-border bg-fixly-bg text-fixly-text hover:border-fixly-accent'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
