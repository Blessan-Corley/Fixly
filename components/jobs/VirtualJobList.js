// components/jobs/VirtualJobList.js - Optimized job listing with virtual scrolling
'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualList from '../ui/VirtualList';
import JobCardRectangular from '../JobCardRectangular';
import { LoadingSkeleton } from '../ui/LoadingStates';
import { useInfiniteJobs } from '../../hooks/useQuery';
import { getClientAbly, CHANNELS, EVENTS } from '../../lib/ably';
import { toast } from 'sonner';

export default function VirtualJobList({
  filters = {},
  height = 600,
  className = '',
  onJobClick,
  onJobApply,
  user,
  sortBy = 'newest',
  showFilters = true,
  enableRealTimeFiltering = true,
  showDistance = true,
  userLocation = null
}) {
  const [realtimeJobs, setRealtimeJobs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [sortDirection, setSortDirection] = useState('desc');

  // Use infinite query for job data
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteJobs(
    { ...filters, sortBy },
    {
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.currentPage + 1 : undefined,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );

  // Enhanced job processing with distance calculation and filtering
  const allJobs = useMemo(() => {
  const queryJobs = data?.pages ? data.pages.flatMap(page => page.jobs || []) : [];
  
  // Remove duplicates between real-time and query jobs
  const uniqueRealtimeJobs = realtimeJobs.filter(rtJob => 
    !queryJobs.some(queryJob => queryJob._id === rtJob._id)
  );

  let combinedJobs = [...uniqueRealtimeJobs, ...queryJobs];

  // Calculate distances if user location is available
  if (userLocation && showDistance) {
    combinedJobs = combinedJobs.map(job => {
      if (job.location?.lat && job.location?.lng) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          job.location.lat,
          job.location.lng
        );
        return { ...job, distance };
      }
      return job;
    });
  }

  // Apply real-time filtering
  if (enableRealTimeFiltering) {
    combinedJobs = applyAdvancedFilters(combinedJobs, appliedFilters, userLocation);
  }

  // Apply sorting
  combinedJobs = applySorting(combinedJobs, sortBy, sortDirection, userLocation);

  return combinedJobs;
}, [data, realtimeJobs, userLocation, showDistance, enableRealTimeFiltering, appliedFilters, sortBy, sortDirection]);

  // Distance calculation function
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Advanced filtering function
  const applyAdvancedFilters = (jobs, filters, userLocation) => {
    return jobs.filter(job => {
      // Skills matching
      if (filters.skills && filters.skills.length > 0) {
        const hasMatchingSkill = filters.skills.some(skill =>
          job.skillsRequired?.some(jobSkill =>
            jobSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        if (!hasMatchingSkill) return false;
      }

      // Location radius filtering
      if (filters.radius && userLocation && job.distance !== undefined) {
        if (job.distance > filters.radius) return false;
      }

      // Budget range filtering
      if (filters.budgetMin && job.budget?.amount && job.budget.amount < filters.budgetMin) {
        return false;
      }
      if (filters.budgetMax && job.budget?.amount && job.budget.amount > filters.budgetMax) {
        return false;
      }

      // Urgency filtering
      if (filters.urgency && filters.urgency.length > 0) {
        if (!filters.urgency.includes(job.urgency)) return false;
      }

      // Posted within time filter
      if (filters.postedWithin && filters.postedWithin !== 'all') {
        const now = new Date();
        const postedDate = new Date(job.createdAt);
        const timeDiff = now - postedDate;
        const hours = timeDiff / (1000 * 60 * 60);

        switch (filters.postedWithin) {
          case '1h':
            if (hours > 1) return false;
            break;
          case '6h':
            if (hours > 6) return false;
            break;
          case '24h':
            if (hours > 24) return false;
            break;
          case '7d':
            if (hours > 168) return false;
            break;
        }
      }

      return true;
    });
  };

  // Advanced sorting function
  const applySorting = (jobs, sortBy, direction, userLocation) => {
    const sortedJobs = [...jobs];

    sortedJobs.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'newest':
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
          break;
        case 'oldest':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'budget':
          comparison = (b.budget?.amount || 0) - (a.budget?.amount || 0);
          break;
        case 'deadline':
          comparison = new Date(a.deadline) - new Date(b.deadline);
          break;
        case 'distance':
          if (userLocation) {
            comparison = (a.distance || Infinity) - (b.distance || Infinity);
          }
          break;
        case 'relevance':
          // Calculate relevance based on user skills
          if (user?.skills) {
            const aRelevance = calculateRelevanceScore(a, user.skills);
            const bRelevance = calculateRelevanceScore(b, user.skills);
            comparison = bRelevance - aRelevance;
          }
          break;
      }

      return direction === 'desc' ? comparison : -comparison;
    });

    return sortedJobs;
  };

  // Calculate relevance score based on user skills
  const calculateRelevanceScore = (job, userSkills) => {
    if (!job.skillsRequired || !userSkills) return 0;

    const matchingSkills = job.skillsRequired.filter(jobSkill =>
      userSkills.some(userSkill =>
        userSkill.toLowerCase() === jobSkill.toLowerCase()
      )
    );

    return matchingSkills.length / job.skillsRequired.length;
  };

  // Real-time job updates with proper cleanup
useEffect(() => {
  if (!user || user.role !== 'fixer') return;

  let ably = null;
  let channels = [];
  let isActive = true;
  const abortController = new AbortController();

  const setupRealtimeConnection = async () => {
    if (!isActive) return;

    try {
      ably = getClientAbly();
      if (!ably || !isActive) return;

      ably.options.clientId = `fixer-${user.id}`;

      // Connection events
      ably.connection.on('connected', () => {
        console.log('✅ VirtualJobList connected to Ably');
        setConnectionStatus('connected');
      });

      ably.connection.on('disconnected', () => {
        console.log('⚠️ VirtualJobList disconnected from Ably');
        setConnectionStatus('disconnected');
      });

      ably.connection.on('failed', (error) => {
        console.error('❌ VirtualJobList Ably connection failed:', error);
        setConnectionStatus('failed');
      });

      // Subscribe to general new jobs
      const newJobsChannel = ably.channels.get(CHANNELS.newJobs);
      channels.push(newJobsChannel);

      const jobPostedCallback = (message) => {
        const newJob = message.data;
        console.log('📨 New job received:', newJob.title);

        // Check if job matches current filters
        const matchesSkills = !filters.skills || filters.skills.length === 0 ||
          filters.skills.some(skill => 
            newJob.skillsRequired?.some(jobSkill => 
              jobSkill.toLowerCase().includes(skill.toLowerCase())
            )
          );

        const matchesLocation = !filters.location?.city ||
          newJob.location?.city === filters.location.city;

        if (matchesSkills && matchesLocation) {
          setRealtimeJobs(prev => {
            const existingJobIndex = prev.findIndex(job => job._id === newJob.jobId);
            if (existingJobIndex !== -1) return prev; // Don't duplicate
            
            return [{
              ...newJob,
              _id: newJob.jobId,
              isRealTimeUpdate: true,
              createdAt: newJob.timestamp || newJob.createdAt
            }, ...prev.slice(0, 9)]; // Keep only 10 real-time jobs
          });

          toast.success(`New ${newJob.title} job posted!`, {
            description: `Budget: ₹${newJob.budget?.amount?.toLocaleString() || 'Negotiable'}`,
            action: {
              label: 'View',
              onClick: () => onJobClick && onJobClick(newJob.jobId)
            }
          });
        }
      };

      await newJobsChannel.subscribe(EVENTS.JOB_POSTED, jobPostedCallback);

      // Subscribe to skill-specific channels if filters are applied
      if (filters.skills && filters.skills.length > 0) {
        for (const skill of filters.skills) {
          const skillChannel = ably.channels.get(CHANNELS.skillJobs(skill));
          channels.push(skillChannel);

          const skillCallback = (message) => {
            console.log(`📨 Skill-specific job for ${skill}:`, message.data.title);
          };

          await skillChannel.subscribe(EVENTS.JOB_POSTED, skillCallback);
        }
      }

      // Subscribe to location-specific channel if filter is applied
      if (filters.location?.city && filters.location?.state) {
        const locationChannel = ably.channels.get(CHANNELS.locationJobs(filters.location.city, filters.location.state));
        channels.push(locationChannel);

        const locationCallback = (message) => {
          console.log(`📨 Location-specific job for ${filters.location.city}:`, message.data.title);
        };

        await locationChannel.subscribe(EVENTS.JOB_POSTED, locationCallback);
      }

    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('❌ Real-time setup error:', error);
        setConnectionStatus('failed');
      }
    }
  };

  setupRealtimeConnection();

  // Cleanup with proper async handling
  return () => {
    isActive = false;
    abortController.abort();

    // Cleanup all channels in parallel
    Promise.allSettled(
      channels.map(channel =>
        Promise.resolve().then(() => {
          try {
            channel.unsubscribe();
            channel.detach();
          } catch (error) {
            console.error('Channel cleanup error:', error);
          }
        })
      )
    );

    if (ably) {
      // Don't close shared ably connection - it's managed by AblyContext
    }
  };
}, [user, JSON.stringify(filters)]); // Use JSON.stringify for deep comparison


  // Clear real-time jobs when filters change
  useEffect(() => {
    setRealtimeJobs([]);
  }, [filters]);

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
        userLocation={userLocation}
        showDistance={showDistance}
      />
    </motion.div>
  ), [user, onJobApply, onJobClick, userLocation, showDistance]);

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
          userLocation={null} // Grid view doesn't use distance
          showDistance={false}
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
    <VirtualList
      items={allJobs}
      height={height}
      itemHeight={itemHeight}
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

// Default export already declared in function definition above