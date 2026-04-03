'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Loader, MapPin, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

import JobCardRectangular from '../../../components/JobCardRectangular';
import LocationPermission from '../../../components/ui/LocationPermission';
import { RoleGuard } from '../../providers';

import BrowseFiltersPanel from './BrowseFiltersPanel';
import { useBrowseJobs } from './useBrowseJobs';

export default function BrowseJobsPage(): JSX.Element {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <BrowseJobsContent />
    </RoleGuard>
  );
}

function BrowseJobsContent(): JSX.Element | null {
  const router = useRouter();

  const {
    jobs,
    normalizedUser,
    rawUser,
    filters,
    showFilters,
    applyingJobs,
    searchLoading,
    showRefreshMessage,
    loading,
    refreshing,
    pagination,
    userLocation,
    locationEnabled,
    handleLocationUpdate,
    handleFilterChange,
    handleRefresh,
    handleQuickApply,
    loadMore,
    clearFilters,
    setShowFilters,
  } = useBrowseJobs();

  if (loading && jobs.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <Loader className="mb-4 h-8 w-8 animate-spin text-fixly-accent" />
          <p className="mb-2 text-fixly-text-light">Loading jobs...</p>

          {showRefreshMessage && (
            <div className="mt-4 max-w-md rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
              <AlertCircle className="mx-auto mb-2 h-5 w-5 text-yellow-600" />
              <p className="mb-3 text-sm text-yellow-800">
                Jobs taking too long to load? Try refreshing:
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
              >
                Refresh Page
              </button>
              <p className="mt-2 text-xs text-yellow-700">This usually resolves loading issues</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between lg:flex-row lg:items-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-fixly-text">Find Jobs</h1>
          <p className="text-fixly-text-light">
            Browse available jobs in your area. You have{' '}
            <span className="font-semibold text-fixly-accent">
              {normalizedUser.planType === 'pro'
                ? 'unlimited'
                : Math.max(0, 3 - normalizedUser.creditsUsed)}
            </span>{' '}
            applications remaining.
          </p>
        </div>

        <div className="mt-4 flex items-center space-x-4 lg:mt-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost flex items-center"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {normalizedUser.planType !== 'pro' && (
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="btn-primary flex items-center"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      <LocationPermission
        onLocationUpdate={handleLocationUpdate}
        showBanner={!locationEnabled}
        className="mb-6"
      />

      {locationEnabled && filters.sortBy === 'distance' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border-2 border-fixly-accent/20 bg-gradient-to-r from-fixly-accent/10 to-teal-50 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-fixly-accent/20">
                <MapPin className="h-5 w-5 text-fixly-accent" />
              </div>
              <div>
                <h3 className="flex items-center font-semibold text-fixly-text">
                  Jobs sorted by proximity
                  {filters.maxDistance && (
                    <span className="ml-2 rounded-full bg-fixly-accent/20 px-2 py-1 text-xs text-fixly-accent">
                      Within {filters.maxDistance}km
                    </span>
                  )}
                </h3>
                <p className="text-sm text-fixly-text-muted">
                  Showing nearest opportunities first - {jobs.length} jobs found
                </p>
              </div>
            </div>
            <div className="hidden items-center text-sm text-fixly-accent md:flex">
              <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-fixly-accent"></div>
              GPS Active
            </div>
          </div>
        </motion.div>
      )}

      <BrowseFiltersPanel
        filters={filters}
        showFilters={showFilters}
        searchLoading={searchLoading}
        locationEnabled={locationEnabled}
        paginationTotal={pagination.total}
        onFilterChange={handleFilterChange}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
      />

      {jobs.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">No jobs found</h3>
          <p className="mb-4 text-fixly-text-muted">
            Try adjusting your search criteria or check back later for new opportunities.
          </p>
          <button onClick={clearFilters} className="btn-primary">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCardRectangular
              key={job._id}
              job={job}
              user={rawUser}
              onApply={handleQuickApply}
              isApplying={applyingJobs.has(job._id)}
              userLocation={userLocation}
              showDistance={locationEnabled}
            />
          ))}
        </div>
      )}

      {pagination.hasMore && jobs.length > 0 && (
        <div className="mt-8 text-center">
          <button onClick={loadMore} disabled={loading} className="btn-primary">
            {loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load More Jobs
          </button>
        </div>
      )}

      {normalizedUser.planType !== 'pro' && normalizedUser.creditsUsed >= 3 && (
        <div className="card fixed bottom-6 right-6 max-w-sm border-fixly-accent shadow-fixly-lg">
          <div className="flex items-start">
            <TrendingUp className="mr-3 mt-1 h-6 w-6 text-fixly-accent" />
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-fixly-text">Upgrade to Pro</h4>
              <p className="mb-3 text-sm text-fixly-text-muted">
                You&apos;ve used all free applications. Upgrade for unlimited access.
              </p>
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="btn-primary w-full text-sm"
              >
                Upgrade Now - Rs 99/month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
