import { useState, useEffect, useCallback, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

const InfiniteJobList = ({ 
  filters = {}, 
  location = null,
  onJobClick,
  ItemComponent,
  LoadingComponent,
  EmptyComponent,
  ErrorComponent 
}) => {
  const [isManualLoading, setIsManualLoading] = useState(false);
  const observerRef = useRef();
  const loadingRef = useRef();

  // Infinite query for jobs
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch
  } = useInfiniteQuery({
    queryKey: ['jobs', filters, location],
    queryFn: async ({ pageParam = 1 }) => {
      const url = location ? '/api/jobs/nearby' : '/api/jobs';
      
      const body = location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius || 25,
        limit: 20,
        offset: (pageParam - 1) * 20,
        filters,
        sortBy: filters.sortBy || 'distance',
        sortOrder: filters.sortOrder || 1
      } : null;
      
      const queryParams = !location ? new URLSearchParams({
        page: pageParam,
        limit: 20,
        ...filters,
        ...(filters.skills && { skills: filters.skills.join(',') })
      }).toString() : '';
      
      const requestConfig = {
        method: location ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) })
      };
      
      const response = await fetch(
        location ? url : `${url}?${queryParams}`,
        requestConfig
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (location) {
        return lastPage.pagination?.hasMore ? pages.length + 1 : undefined;
      } else {
        return lastPage.pagination?.hasMore ? lastPage.pagination.nextPage : undefined;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Intersection Observer for auto-loading
  useEffect(() => {
    if (!loadingRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Manual load more handler
  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    
    setIsManualLoading(true);
    try {
      await fetchNextPage();
    } finally {
      setIsManualLoading(false);
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Flatten all pages into single array
  const allJobs = data?.pages?.flatMap(page => page.jobs) || [];
  const totalCount = data?.pages?.[0]?.pagination?.total;
  const isLocationBased = !!location;

  // Loading states
  if (isLoading && allJobs.length === 0) {
    return LoadingComponent ? (
      <LoadingComponent />
    ) : (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading jobs...</span>
      </div>
    );
  }

  // Error state
  if (isError && allJobs.length === 0) {
    return ErrorComponent ? (
      <ErrorComponent error={error} onRetry={refetch} />
    ) : (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Failed to load jobs
        </div>
        <button 
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && allJobs.length === 0) {
    return EmptyComponent ? (
      <EmptyComponent />
    ) : (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          No jobs found
        </div>
        <p className="text-gray-400 text-sm">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results summary */}
      <div className="flex justify-between items-center text-sm text-gray-600 border-b pb-2">
        <div>
          {totalCount && (
            <span>
              Showing {allJobs.length} of {totalCount} jobs
            </span>
          )}
          {!totalCount && allJobs.length > 0 && (
            <span>
              Showing {allJobs.length} jobs
            </span>
          )}
          {isLocationBased && (
            <span className="ml-2 text-blue-600">
              📍 Near your location
            </span>
          )}
        </div>
        
        {error && (
          <button 
            onClick={refetch}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Job list */}
      <div className="space-y-4">
        {allJobs.map((job, index) => (
          <div key={`${job._id || job.id}-${index}`} className="job-item">
            {ItemComponent ? (
              <ItemComponent 
                job={job} 
                onClick={() => onJobClick?.(job)}
                index={index}
                isLocationBased={isLocationBased}
              />
            ) : (
              <DefaultJobCard 
                job={job} 
                onClick={() => onJobClick?.(job)}
                isLocationBased={isLocationBased}
              />
            )}
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {hasNextPage && (
        <div ref={loadingRef} className="py-6">
          {isFetchingNextPage || isManualLoading ? (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading more jobs...</span>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Load More Jobs
              </button>
            </div>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasNextPage && allJobs.length > 0 && (
        <div className="text-center py-6 text-gray-500 text-sm border-t">
          <div className="inline-flex items-center">
            <span className="h-px bg-gray-300 flex-1 mr-3"></span>
            You've reached the end of the job listings
            <span className="h-px bg-gray-300 flex-1 ml-3"></span>
          </div>
        </div>
      )}

      {/* Performance metrics (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-50 rounded">
          Pages loaded: {data?.pages?.length || 0} | 
          Total jobs: {allJobs.length} |
          Has more: {hasNextPage ? 'Yes' : 'No'} |
          Loading: {isFetchingNextPage ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
};

// Default job card component
const DefaultJobCard = ({ job, onClick, isLocationBased }) => {
  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
          {job.title}
        </h3>
        {job.featured && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Featured
          </span>
        )}
      </div>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
        {job.description}
      </p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {job.skills?.slice(0, 3).map((skill, index) => (
          <span 
            key={index}
            className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
          >
            {skill}
          </span>
        ))}
        {job.skills?.length > 3 && (
          <span className="text-gray-400 text-xs">
            +{job.skills.length - 3} more
          </span>
        )}
      </div>
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          {job.salary && (
            <span className="font-medium text-green-600">
              ${job.salary.min?.toLocaleString()}-${job.salary.max?.toLocaleString()}
            </span>
          )}
          {isLocationBased && job.distanceKm !== undefined && (
            <span className="flex items-center">
              📍 {job.distanceKm}km away
            </span>
          )}
          {job.address?.city && (
            <span>{job.address.city}, {job.address.state}</span>
          )}
        </div>
        <span>
          {new Date(job.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default InfiniteJobList;