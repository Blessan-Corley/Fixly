import { Grid, List } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives/Select';

import type { ViewMode } from '../_lib/search.types';

type SearchResultsToolbarProps = {
  hasSearched: boolean;
  totalResults: number;
  searchQuery: string;
  selectedLocation: string;
  sortBy: string;
  viewMode: ViewMode;
  onSortByChange: (value: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
};

export function SearchResultsToolbar({
  hasSearched,
  totalResults,
  searchQuery,
  selectedLocation,
  sortBy,
  viewMode,
  onSortByChange,
  onViewModeChange,
}: SearchResultsToolbarProps): React.JSX.Element | null {
  if (!hasSearched) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-fixly-text">
          {totalResults > 0 ? `${totalResults} jobs found` : 'No jobs found'}
        </h1>
        {searchQuery && (
          <p className="text-fixly-text-light">
            Results for "{searchQuery}"{selectedLocation ? ` in ${selectedLocation}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-fixly-text-light">Sort by:</span>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-9 w-[220px] rounded-lg text-sm" aria-label="Sort by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="budget_high">Budget: High to Low</SelectItem>
              <SelectItem value="budget_low">Budget: Low to High</SelectItem>
              <SelectItem value="applications">Most Applications</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center rounded-lg border border-fixly-border">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-fixly-accent text-white' : 'text-fixly-text-light'}`}
            aria-label="Grid view"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-fixly-accent text-white' : 'text-fixly-text-light'}`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
