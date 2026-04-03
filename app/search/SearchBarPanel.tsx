'use client';

import { Loader, MapPin, Search, SlidersHorizontal } from 'lucide-react';

import { AdvancedSearchFilters } from './_components/AdvancedSearchFilters';
import { SelectedSkillsChips } from './_components/SelectedSkillsChips';
import type { SearchFilters } from './_lib/search.types';

type Props = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  locationQuery: string;
  selectedLocation: string;
  locationSuggestions: string[];
  showLocationSuggestions: boolean;
  onLocationSearch: (query: string) => void;
  onSelectLocation: (city: string) => void;
  skillQuery: string;
  skillSuggestions: string[];
  showSkillSuggestions: boolean;
  onSkillSearch: (query: string) => void;
  onAddSkill: (skill: string) => void;
  selectedSkills: string[];
  onRemoveSkill: (skill: string) => void;
  loading: boolean;
  isSearchOpen: boolean;
  onToggleSearchOpen: () => void;
  filters: SearchFilters;
  onFilterFieldChange: (field: keyof SearchFilters, value: string) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  onSearch: () => void;
};

export default function SearchBarPanel({
  searchQuery, onSearchQueryChange,
  locationQuery, selectedLocation, locationSuggestions, showLocationSuggestions,
  onLocationSearch, onSelectLocation,
  skillQuery, skillSuggestions, showSkillSuggestions, onSkillSearch, onAddSkill,
  selectedSkills, onRemoveSkill,
  loading, isSearchOpen, onToggleSearchOpen,
  filters, onFilterFieldChange, onClearFilters, onApplyFilters,
  onSearch,
}: Props): React.JSX.Element {
  return (
    <div className="sticky top-0 z-10 border-b border-fixly-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search jobs..."
              className="input-field pl-10"
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={locationQuery || selectedLocation}
              onChange={(e) => {
                if (selectedLocation) onSelectLocation('');
                onLocationSearch(e.target.value);
              }}
              placeholder="Location"
              className="input-field pl-10"
            />
            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-fixly-border bg-white shadow-lg">
                {locationSuggestions.map((city, index) => (
                  <button
                    key={`${city}-${index}`}
                    type="button"
                    onClick={() => onSelectLocation(city)}
                    className="w-full px-4 py-2 text-left hover:bg-fixly-bg"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={skillQuery}
              onChange={(e) => onSkillSearch(e.target.value)}
              placeholder="Add skills..."
              className="input-field"
            />
            {showSkillSuggestions && skillSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-fixly-border bg-white shadow-lg">
                {skillSuggestions.map((skill, index) => (
                  <button
                    key={`${skill}-${index}`}
                    type="button"
                    onClick={() => onAddSkill(skill)}
                    className="w-full px-4 py-2 text-left hover:bg-fixly-bg"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button type="button" onClick={onSearch} disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </button>
            <button
              type="button"
              onClick={onToggleSearchOpen}
              className="btn-ghost px-3"
              aria-label="Toggle advanced filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <SelectedSkillsChips selectedSkills={selectedSkills} onRemoveSkill={onRemoveSkill} />

        {isSearchOpen && (
          <AdvancedSearchFilters
            filters={filters}
            onFieldChange={onFilterFieldChange}
            onClear={onClearFilters}
            onApply={onApplyFilters}
          />
        )}
      </div>
    </div>
  );
}
