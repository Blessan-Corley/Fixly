'use client';

import { SearchErrorState } from './_components/SearchErrorState';
import { SearchJobCard } from './_components/SearchJobCard';
import { SearchLoadingState } from './_components/SearchLoadingState';
import { SearchNoResultsState } from './_components/SearchNoResultsState';
import { SearchResultsToolbar } from './_components/SearchResultsToolbar';
import { SearchWelcomeState } from './_components/SearchWelcomeState';
import SearchBarPanel from './SearchBarPanel';
import { useSearchPage } from './useSearchPage';

export default function SearchPage(): React.JSX.Element {
  const {
    searchQuery, setSearchQuery,
    selectedLocation, setSelectedLocation,
    selectedSkills,
    hasSearched,
    isSearchOpen, setSearchOpen,
    filters,
    viewMode, setViewMode,
    locationQuery, locationSuggestions, showLocationSuggestions,
    skillQuery, skillSuggestions, showSkillSuggestions,
    loading, jobs, totalResults, error,
    performSearch, handleLocationSearch, handleSkillSearch,
    addSkill, removeSkill, clearFilters, handleFilterFieldChange, handleSortByChange,
    openJob,
  } = useSearchPage();

  return (
    <div className="min-h-screen bg-fixly-bg">
      <SearchBarPanel
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        locationQuery={locationQuery}
        selectedLocation={selectedLocation}
        locationSuggestions={locationSuggestions}
        showLocationSuggestions={showLocationSuggestions}
        onLocationSearch={handleLocationSearch}
        onSelectLocation={(city) => {
          setSelectedLocation(city);
        }}
        skillQuery={skillQuery}
        skillSuggestions={skillSuggestions}
        showSkillSuggestions={showSkillSuggestions}
        onSkillSearch={handleSkillSearch}
        onAddSkill={addSkill}
        selectedSkills={selectedSkills}
        onRemoveSkill={removeSkill}
        loading={loading}
        isSearchOpen={isSearchOpen}
        onToggleSearchOpen={() => setSearchOpen(!isSearchOpen)}
        filters={filters}
        onFilterFieldChange={handleFilterFieldChange}
        onClearFilters={clearFilters}
        onApplyFilters={() => void performSearch()}
        onSearch={() => void performSearch()}
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <SearchResultsToolbar
          hasSearched={hasSearched}
          totalResults={totalResults}
          searchQuery={searchQuery}
          selectedLocation={selectedLocation}
          sortBy={filters.sortBy}
          viewMode={viewMode}
          onSortByChange={handleSortByChange}
          onViewModeChange={setViewMode}
        />

        {loading && <SearchLoadingState />}

        {error && <SearchErrorState message={error} onRetry={() => void performSearch()} />}

        {hasSearched && !loading && jobs.length === 0 && !error && (
          <SearchNoResultsState
            onClearFilters={clearFilters}
            onBrowseAllJobs={() => openJob('')}
          />
        )}

        {jobs.length > 0 && (
          <div
            className={`grid gap-6 ${
              viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
            }`}
          >
            {jobs.map((job) => (
              <SearchJobCard key={job._id} job={job} onOpenJob={openJob} />
            ))}
          </div>
        )}

        {!hasSearched && !loading && <SearchWelcomeState />}
      </div>
    </div>
  );
}
