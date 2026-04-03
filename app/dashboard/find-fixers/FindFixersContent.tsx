'use client';

import { Award, Loader, User } from 'lucide-react';

import FindFixersFiltersPanel from './FindFixersFiltersPanel';
import FixerCard from './FixerCard';
import FixerMessageModal from './FixerMessageModal';
import FixerProfileModal from './FixerProfileModal';
import { useFindFixers } from './useFindFixers';

const SKILL_OPTIONS = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Cleaning',
  'AC Repair',
  'Appliance Repair',
  'Gardening',
  'Moving',
  'Handyman',
  'Pest Control',
  'Home Security',
  'Interior Design',
  'Masonry',
];

export function FindFixersContent(): React.JSX.Element {
  const {
    fixers,
    loading,
    searching,
    pagination,
    filters,
    showFilters,
    selectedFixer,
    showProfileModal,
    showMessageModal,
    handleSearch,
    handleFilterChange,
    handleSkillToggle,
    handleContactFixer,
    handleViewProfile,
    handleLoadMore,
    handleClearFilters,
    setShowFilters,
    setShowProfileModal,
    setShowMessageModal,
    setSelectedFixer,
  } = useFindFixers();

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-fixly-text">Find Pro Fixers</h1>
          <span className="flex items-center rounded-full bg-fixly-accent/20 px-3 py-1 text-sm text-fixly-primary">
            <Award className="mr-1 h-4 w-4" />
            Pro Only
          </span>
        </div>
        <p className="text-fixly-text-light">
          Exclusively verified professional fixers with active Pro subscriptions
        </p>
      </div>

      {/* Search and Filters */}
      <FindFixersFiltersPanel
        filters={filters}
        showFilters={showFilters}
        searching={searching}
        skillOptions={SKILL_OPTIONS}
        onFilterChange={handleFilterChange}
        onSkillToggle={handleSkillToggle}
        onSearch={handleSearch}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {fixers.map((fixer) => (
              <FixerCard
                key={fixer._id}
                fixer={fixer}
                onViewProfile={handleViewProfile}
                onContact={handleContactFixer}
              />
            ))}
          </div>

          {pagination.hasMore && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                disabled={searching}
                className="btn-secondary"
              >
                {searching ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load More Fixers
              </button>
            </div>
          )}

          {!loading && fixers.length === 0 && (
            <div className="py-12 text-center">
              <User className="mx-auto mb-4 h-16 w-16 text-fixly-text-muted" />
              <h3 className="mb-2 text-xl font-semibold text-fixly-text">No Fixers Found</h3>
              <p className="mb-4 text-fixly-text-muted">
                Try adjusting your search criteria or filters to find more fixers.
              </p>
              <button onClick={handleClearFilters} className="btn-primary">
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}

      {showProfileModal && selectedFixer && (
        <FixerProfileModal
          fixer={selectedFixer}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedFixer(null);
          }}
          onContact={() => {
            setShowProfileModal(false);
            setShowMessageModal(true);
          }}
        />
      )}

      {showMessageModal && selectedFixer && (
        <FixerMessageModal
          fixer={selectedFixer}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedFixer(null);
          }}
        />
      )}
    </div>
  );
}
