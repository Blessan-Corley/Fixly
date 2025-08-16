// components/jobs/VirtualJobList.js - Optimized job listing with virtual scrolling
'use client';

import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import VirtualList from '../ui/VirtualList';
import JobCardRectangular from '../JobCardRectangular';
import { LoadingSkeleton } from '../ui/LoadingStates';
import { useInfiniteJobs } from '../../hooks/useQuery';

export default function VirtualJobList({
  filters = {},
  height = 600,
  className = '',
  onJobClick,
  onJobApply,
  user,
  sortBy = 'newest',
  showFilters = true
}) {
  // Use infinite query for job data
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteJobs(
    { ...filters, sortBy },
    {
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.currentPage + 1 : undefined,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );

  // Flatten all pages into a single array
  const allJobs = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.jobs || []);
  }, [data]);

  // Memoized render function for performance
  const renderJobItem = useCallback((job, index, { style, isVisible }) => (
    <motion.div
      key={job._id}
      style={style}
      className="px-4 py-2"
      initial={isVisible ? { opacity: 0, y: 20 } : false}
      animate={isVisible ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <JobCardRectangular
        job={job}
        user={user}
        onApply={onJobApply}
        isApplying={false}
        onClick={() => onJobClick?.(job)}
      />
    </motion.div>
  ), [user, onJobApply, onJobClick]);

  // Handle load more for infinite scrolling
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading skeleton for initial load
  const renderLoadingSkeleton = useCallback((_, index) => (
    <div key={`skeleton-${index}`} className="px-4 py-2">
      <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <LoadingSkeleton className="h-6 w-3/4 mb-2" />
            <div className="flex items-center gap-4">
              <LoadingSkeleton className="h-4 w-24" />
              <LoadingSkeleton className="h-4 w-16" />
              <LoadingSkeleton className="h-4 w-20" />
            </div>
          </div>
          <LoadingSkeleton className="h-6 w-16" />
        </div>
        
        <LoadingSkeleton className="h-4 w-full mb-2" />
        <LoadingSkeleton className="h-4 w-2/3 mb-4" />
        
        <div className="flex gap-2 mb-4">
          <LoadingSkeleton className="h-6 w-16" />
          <LoadingSkeleton className="h-6 w-20" />
          <LoadingSkeleton className="h-6 w-18" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LoadingSkeleton className="h-5 w-24" />
            <LoadingSkeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <LoadingSkeleton className="h-8 w-20" />
            <LoadingSkeleton className="h-8 w-20" />
            <LoadingSkeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  ), []);

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 mb-2">
          Failed to load jobs
        </h3>
        <p className="text-fixly-text-muted dark:text-gray-400 mb-4">
          {error.message || 'Something went wrong while loading jobs.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-fixly-accent text-white px-4 py-2 rounded-lg hover:bg-fixly-accent-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    const skeletonItems = Array.from({ length: 5 }, (_, i) => ({ _id: `skeleton-${i}` }));
    return (
      <VirtualList
        items={skeletonItems}
        height={height}
        itemHeight={200}
        renderItem={renderLoadingSkeleton}
        className={`${className} bg-fixly-bg dark:bg-gray-900`}
      />
    );
  }

  // Empty state
  if (!allJobs.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 mb-2">
          No jobs found
        </h3>
        <p className="text-fixly-text-muted dark:text-gray-400 mb-4">
          {showFilters 
            ? 'Try adjusting your search filters or check back later for new opportunities.'
            : 'No jobs available at the moment. Check back later for new opportunities.'
          }
        </p>
        {showFilters && (
          <button
            onClick={() => window.location.href = '/dashboard/jobs'}
            className="bg-fixly-accent text-white px-4 py-2 rounded-lg hover:bg-fixly-accent-dark transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  // Main virtual list
  return (
    <div className="space-y-4">
      {/* Results summary */}
      <div className="flex items-center justify-between px-4">
        <div className="text-sm text-fixly-text-muted dark:text-gray-400">
          Showing {allJobs.length} job{allJobs.length !== 1 ? 's' : ''}
          {hasNextPage && (
            <span className="ml-1">
              (scroll for more)
            </span>
          )}
        </div>
        
        {isFetchingNextPage && (
          <div className="flex items-center text-sm text-fixly-text-muted dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fixly-accent mr-2"></div>
            Loading more...
          </div>
        )}
      </div>

      {/* Virtual scrolling list */}
      <VirtualList
        items={allJobs}
        height={height}
        itemHeight={180}
        renderItem={renderJobItem}
        overscan={3}
        className={`${className} bg-fixly-bg dark:bg-gray-900 rounded-xl border border-fixly-border dark:border-gray-700`}
        loadMore={handleLoadMore}
        hasMore={hasNextPage}
        loading={isFetchingNextPage}
        threshold={300}
        onScroll={(e, { scrollTop, visibleStartIndex, visibleEndIndex }) => {
          // Optional: Track scroll analytics
          // analytics.trackEvent('job_list_scroll', {
          //   scrollTop,
          //   visibleRange: `${visibleStartIndex}-${visibleEndIndex}`,
          //   totalJobs: allJobs.length
          // });
        }}
      />
    </div>
  );
}

// Grid version for card layout
export function VirtualJobGrid({
  filters = {},
  height = 600,
  className = '',
  onJobClick,
  onJobApply,
  user,
  columns = 'auto',
  itemWidth = 300,
  itemHeight = 200
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteJobs(filters);

  const allJobs = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.jobs || []);
  }, [data]);

  const renderJobCard = useCallback((job, index, { row, col, isVisible }) => (
    <motion.div
      key={job._id}
      className="p-2"
      initial={isVisible ? { opacity: 0, scale: 0.9 } : false}
      animate={isVisible ? { opacity: 1, scale: 1 } : false}
      transition={{ duration: 0.3, delay: (row * 2 + col) * 0.1 }}
      style={{ height: '100%' }}
    >
      <div className="h-full">
        <JobCardRectangular
          job={job}
          user={user}
          onApply={onJobApply}
          isApplying={false}
          onClick={() => onJobClick?.(job)}
        />
      </div>
    </motion.div>
  ), [user, onJobApply, onJobClick]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
            <LoadingSkeleton className="h-6 w-3/4 mb-4" />
            <LoadingSkeleton className="h-4 w-full mb-2" />
            <LoadingSkeleton className="h-4 w-2/3 mb-4" />
            <div className="flex gap-2 mb-4">
              <LoadingSkeleton className="h-6 w-16" />
              <LoadingSkeleton className="h-6 w-20" />
            </div>
            <div className="flex justify-between items-center">
              <LoadingSkeleton className="h-5 w-24" />
              <LoadingSkeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !allJobs.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">{error ? '⚠️' : '🔍'}</div>
        <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 mb-2">
          {error ? 'Failed to load jobs' : 'No jobs found'}
        </h3>
        <p className="text-fixly-text-muted dark:text-gray-400">
          {error?.message || 'No jobs available at the moment.'}
        </p>
      </div>
    );
  }

  return (
    <VirtualGrid
      items={allJobs}
      height={height}
      itemWidth={itemWidth}
      itemHeight={itemHeight}
      columns={columns}
      gap={16}
      renderItem={renderJobCard}
      className={className}
    />
  );
}

// Compact list version for mobile
export function VirtualJobListCompact({
  filters = {},
  height = 400,
  className = '',
  onJobClick,
  user
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteJobs(filters);

  const allJobs = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.jobs || []);
  }, [data]);

  const renderCompactItem = useCallback((job, index, { style }) => (
    <div key={job._id} style={style} className="px-4 py-2">
      <div 
        className="bg-fixly-card dark:bg-gray-800 rounded-lg p-4 border border-fixly-border dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onJobClick?.(job)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-fixly-text dark:text-gray-100 truncate">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-fixly-text-muted dark:text-gray-400 mt-1">
              <span>{job.location?.city}</span>
              <span>•</span>
              <span>₹{job.budget?.amount?.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-fixly-accent">
              {new Date(job.createdAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-fixly-text-muted dark:text-gray-400 mt-1">
              {job.applications?.length || 0} applications
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [onJobClick]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-fixly-card dark:bg-gray-800 rounded-lg p-4 border border-fixly-border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <LoadingSkeleton className="h-5 w-3/4 mb-2" />
                <LoadingSkeleton className="h-4 w-1/2" />
              </div>
              <div className="text-right">
                <LoadingSkeleton className="h-4 w-16 mb-1" />
                <LoadingSkeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <VirtualList
      items={allJobs}
      height={height}
      itemHeight={80}
      renderItem={renderCompactItem}
      overscan={5}
      className={className}
      loadMore={fetchNextPage}
      hasMore={hasNextPage}
      loading={isFetchingNextPage}
    />
  );
}

export default VirtualJobList;