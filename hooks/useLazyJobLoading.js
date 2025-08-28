import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for lazy loading jobs with infinite scroll
 * Optimized for performance with MongoDB Atlas indexes
 */
export const useLazyJobLoading = ({
  apiEndpoint = '/api/jobs/nearby',
  initialFilters = {},
  location = null,
  pageSize = 20,
  enabled = true
}) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  
  // Current state refs
  const currentPage = useRef(0);
  const currentOffset = useRef(0);
  const filtersRef = useRef(initialFilters);
  const locationRef = useRef(location);
  
  // Reset when filters or location change
  const resetResults = useCallback(() => {
    setJobs([]);
    setHasMore(true);
    setError(null);
    setTotalCount(null);
    currentPage.current = 0;
    currentOffset.current = 0;
  }, []);
  
  // Load jobs function
  const loadJobs = useCallback(async (isLoadMore = false) => {
    if (!enabled || (isLoadMore && !hasMore)) return;
    
    const loadingState = isLoadMore ? setLoadingMore : setLoading;
    loadingState(true);
    setError(null);
    
    try {
      const isGeospatial = apiEndpoint.includes('nearby') && locationRef.current;
      
      let response;
      
      if (isGeospatial) {
        // Geospatial API with POST
        const body = {
          latitude: locationRef.current.latitude,
          longitude: locationRef.current.longitude,
          radius: locationRef.current.radius || 25,
          limit: pageSize,
          offset: currentOffset.current,
          filters: filtersRef.current,
          sortBy: filtersRef.current.sortBy || 'distance',
          sortOrder: filtersRef.current.sortOrder || 1
        };
        
        response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        // Regular API with GET
        const params = new URLSearchParams({
          page: currentPage.current + 1,
          limit: pageSize,
          ...filtersRef.current,
          ...(filtersRef.current.skills && { 
            skills: Array.isArray(filtersRef.current.skills) 
              ? filtersRef.current.skills.join(',') 
              : filtersRef.current.skills 
          })
        });
        
        response = await fetch(`${apiEndpoint}?${params}`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.jobs) {
        const newJobs = data.jobs;
        
        if (isLoadMore) {
          setJobs(prev => [...prev, ...newJobs]);
        } else {
          setJobs(newJobs);
        }
        
        // Update pagination state
        setHasMore(data.pagination?.hasMore || false);
        
        // Update total count if available (usually only on first page)
        if (data.pagination?.total !== undefined) {
          setTotalCount(data.pagination.total);
        }
        
        // Update refs for next request
        if (isGeospatial) {
          currentOffset.current += newJobs.length;
        } else {
          currentPage.current += 1;
        }
        
      } else {
        throw new Error(data.error || 'Failed to load jobs');
      }
    } catch (err) {
      console.error('Job loading error:', err);
      setError(err.message);
      
      // Don't reset jobs on error, just show error state
      if (!isLoadMore && jobs.length === 0) {
        setJobs([]);
      }
    } finally {
      loadingState(false);
    }
  }, [apiEndpoint, enabled, hasMore, pageSize, jobs.length]);
  
  // Load more function
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadJobs(true);
    }
  }, [loadJobs, loadingMore, hasMore]);
  
  // Refresh function - reload from start
  const refresh = useCallback(() => {
    resetResults();
    setTimeout(() => loadJobs(false), 0);
  }, [resetResults, loadJobs]);
  
  // Update filters
  const updateFilters = useCallback((newFilters) => {
    filtersRef.current = { ...filtersRef.current, ...newFilters };
    refresh();
  }, [refresh]);
  
  // Update location
  const updateLocation = useCallback((newLocation) => {
    locationRef.current = newLocation;
    refresh();
  }, [refresh]);
  
  // Initial load effect
  useEffect(() => {
    if (enabled) {
      resetResults();
      setTimeout(() => loadJobs(false), 0);
    }
  }, [enabled]); // Only run when enabled changes
  
  // Auto-load more with intersection observer
  const observeTarget = useCallback((node) => {
    if (!node || loadingMore || !hasMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );
    
    observer.observe(node);
    
    return () => observer.disconnect();
  }, [loadMore, loadingMore, hasMore]);
  
  return {
    // Data
    jobs,
    totalCount,
    
    // States
    loading,
    loadingMore,
    hasMore,
    error,
    
    // Actions
    loadMore,
    refresh,
    updateFilters,
    updateLocation,
    
    // Utilities
    observeTarget,
    isEmpty: !loading && jobs.length === 0,
    isStale: false, // Could be enhanced with timestamp checking
    
    // Metadata
    currentPage: currentPage.current,
    currentOffset: currentOffset.current,
    loadedCount: jobs.length
  };
};

/**
 * Simplified hook for basic job listing
 */
export const useJobListing = (filters = {}) => {
  return useLazyJobLoading({
    apiEndpoint: '/api/jobs',
    initialFilters: filters,
    location: null
  });
};

/**
 * Hook for location-based job search
 */
export const useNearbyJobs = (location, filters = {}) => {
  return useLazyJobLoading({
    apiEndpoint: '/api/jobs/nearby',
    initialFilters: filters,
    location,
    enabled: !!location
  });
};

export default useLazyJobLoading;