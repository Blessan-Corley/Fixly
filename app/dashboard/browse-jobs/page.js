'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  AlertCircle,
  Loader,
  RefreshCw,
  TrendingUp,
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  Calendar,
  X
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { searchCities, getAllSkills } from '../../../data/cities';
import JobCardRectangular from '../../../components/JobCardRectangular';
import LocationPermission from '../../../components/ui/LocationPermission';
import { 
  sortJobsByDistance, 
  filterJobsByRadius, 
  formatDistance, 
  DISTANCE_RANGES,
  loadUserLocation 
} from '../../../utils/locationUtils';

export default function BrowseJobsPage() {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <BrowseJobsContent />
    </RoleGuard>
  );
}

function BrowseJobsContent() {
  const { user } = useApp();
  const router = useRouter();

  // Jobs data
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: true,
    total: 0
  });

  // AbortController refs
  const fetchJobsAbortRef = useRef(null);
  const checkJobAbortRef = useRef(null);

  // Cleanup: abort all pending requests on unmount
  useEffect(() => {
    return () => {
      if (fetchJobsAbortRef.current) {
        fetchJobsAbortRef.current.abort();
      }
      if (checkJobAbortRef.current) {
        checkJobAbortRef.current.abort();
      }
    };
  }, []);

  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    skills: [],
    location: '',
    budgetMin: '',
    budgetMax: '',
    urgency: '',
    deadline: '',
    deadlineFilter: '', // 'today', 'tomorrow', 'week', 'month', 'custom'
    customDeadlineStart: '',
    customDeadlineEnd: '',
    sortBy: 'newest',
    maxDistance: null // null means no distance filter
  });
  const [showFilters, setShowFilters] = useState(false);

  // Application state
  const [applyingJobs, setApplyingJobs] = useState(new Set());
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);

  // Initialize location on component mount
  useEffect(() => {
    const cachedLocation = loadUserLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
      setLocationEnabled(true);
      // Update default sort to distance when location is available
      setFilters(prev => ({
        ...prev,
        sortBy: 'distance'
      }));
    }
  }, []);

  // Handle location update from LocationPermission component
  const handleLocationUpdate = (location) => {
    setUserLocation(location);
    setLocationEnabled(!!location);
    
    if (location) {
      // Auto-switch to distance sorting when location is enabled
      setFilters(prev => ({
        ...prev,
        sortBy: 'distance'
      }));
    } else {
      // Switch back to newest when location is disabled
      setFilters(prev => ({
        ...prev,
        sortBy: 'newest',
        maxDistance: null
      }));
    }
  };

  useEffect(() => {
    // Show loading state when user is typing
    setSearchLoading(true);
    
    // Debounce the search to avoid excessive API calls
    const debounceTimer = setTimeout(() => {
      fetchJobs(true);
      setSearchLoading(false);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(debounceTimer);
      setSearchLoading(false);
    };
  }, [filters]);

  const fetchJobs = async (reset = false) => {
    let timeoutId;

    // Cancel previous request
    if (fetchJobsAbortRef.current) {
      fetchJobsAbortRef.current.abort();
    }

    const abortController = new AbortController();
    fetchJobsAbortRef.current = abortController;

    try {
      if (reset) {
        setLoading(true);
        setShowRefreshMessage(false);
        setPagination(prev => ({ ...prev, page: 1 }));

        // Show refresh message if loading takes too long
        timeoutId = setTimeout(() => {
          setShowRefreshMessage(true);
        }, 8000); // Show message after 8 seconds for job list
      }

      const params = new URLSearchParams({
        page: reset ? '1' : pagination.page.toString(),
        limit: '12',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) =>
            value !== '' && (Array.isArray(value) ? value.length > 0 : true)
          )
        )
      });

      if (filters.skills.length > 0) {
        params.set('skills', filters.skills.join(','));
      }

      const response = await fetch(`/api/jobs/browse?${params}`, {
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }
      
      // Check if response has content before parsing JSON
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', text);
        throw new Error('Invalid response from server');
      }

      if (response.ok) {
        let processedJobs = data.jobs;

        // Apply location-based processing if user location is available
        if (userLocation && locationEnabled) {
          // Apply distance filter if set
          if (filters.maxDistance) {
            processedJobs = filterJobsByRadius(
              processedJobs, 
              userLocation.lat, 
              userLocation.lng, 
              filters.maxDistance
            );
          }

          // Apply distance-based sorting
          if (filters.sortBy === 'distance') {
            processedJobs = sortJobsByDistance(
              processedJobs,
              userLocation.lat,
              userLocation.lng
            );
          }
        }

        // Apply deadline-based filtering
        if (filters.deadlineFilter) {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);

          processedJobs = processedJobs.filter(job => {
            const jobDeadline = new Date(job.deadline);

            switch (filters.deadlineFilter) {
              case 'today':
                return jobDeadline >= today && jobDeadline < tomorrow;
              case 'tomorrow':
                const dayAfterTomorrow = new Date(tomorrow);
                dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
                return jobDeadline >= tomorrow && jobDeadline < dayAfterTomorrow;
              case 'week':
                return jobDeadline >= today && jobDeadline <= nextWeek;
              case 'month':
                return jobDeadline >= today && jobDeadline <= nextMonth;
              case 'custom':
                if (filters.customDeadlineStart && filters.customDeadlineEnd) {
                  const startDate = new Date(filters.customDeadlineStart);
                  const endDate = new Date(filters.customDeadlineEnd);
                  return jobDeadline >= startDate && jobDeadline <= endDate;
                }
                return true;
              default:
                return true;
            }
          });
        }

        if (reset) {
          setJobs(processedJobs);
        } else {
          setJobs(prev => [...prev, ...processedJobs]);
        }
        setPagination(data.pagination);
      } else {
        toast.error(data.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      // Ignore abort errors - these are intentional
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShowRefreshMessage(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs(true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      fetchJobs(false);
    }
  };

  const canUserApplyToJob = (user) => {
    if (!user || user.role !== 'fixer') return false;
    if (user.banned) return false;
    if (user.plan?.type === 'pro' && user.plan?.status === 'active') return true;
    
    // For free users, check application limits
    const applicationsUsed = user.plan?.creditsUsed || 0;
    return applicationsUsed < 3; // Free users get 3 applications
  };

  const handleQuickApply = async (jobId) => {
    // Validate jobId
    if (!jobId) {
      toast.error('Invalid job ID. Please try again.');
      return;
    }

    if (!canUserApplyToJob(user)) {
      toast.error('You have used all free applications. Upgrade to Pro for unlimited access.');
      router.push('/dashboard/subscription');
      return;
    }

    // Set loading state for this specific job
    setApplyingJobs(prev => new Set([...prev, jobId]));

    // Cancel previous check request
    if (checkJobAbortRef.current) {
      checkJobAbortRef.current.abort();
    }

    const abortController = new AbortController();
    checkJobAbortRef.current = abortController;

    try {
      const targetUrl = `/dashboard/jobs/${jobId}/apply`;

      // First check if the job exists by making a quick API call
      const checkResponse = await fetch(`/api/jobs/${jobId}?forApplication=true`, {
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      if (!checkResponse.ok) {
        throw new Error(`Job not found or not accessible: ${checkResponse.status}`);
      }

      // Navigate to the application page
      router.push(targetUrl);
      toast.success('Opening application form...');

    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }
      toast.error(`Failed to open application form: ${error.message}`);
      
      // Remove loading state on error
      setApplyingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
    
    // Remove loading state after navigation completes
    setTimeout(() => {
      setApplyingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }, 3000);
  };


  const clearFilters = () => {
    setFilters({
      search: '',
      skills: [],
      location: '',
      budgetMin: '',
      budgetMax: '',
      urgency: '',
      deadline: '',
      deadlineFilter: '',
      customDeadlineStart: '',
      customDeadlineEnd: '',
      sortBy: locationEnabled ? 'distance' : 'newest',
      maxDistance: null
    });
  };


  if (loading && jobs.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent mb-4" />
          <p className="text-fixly-text-light mb-2">Loading jobs...</p>
          
          {showRefreshMessage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md text-center mt-4">
              <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-yellow-800 mb-3">
                Jobs taking too long to load? Try refreshing:
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Refresh Page
              </button>
              <p className="text-xs text-yellow-700 mt-2">
                This usually resolves loading issues
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-fixly-text mb-2">
            Find Jobs
          </h1>
          <p className="text-fixly-text-light">
            Browse available jobs in your area. You have{' '}
            <span className="font-semibold text-fixly-accent">
              {user?.plan?.type === 'pro' ? 'unlimited' : Math.max(0, 3 - (user?.plan?.creditsUsed || 0))}
            </span>{' '}
            applications remaining.
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {user?.plan?.type !== 'pro' && (
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="btn-primary flex items-center"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Location Permission Banner */}
      <LocationPermission 
        onLocationUpdate={handleLocationUpdate}
        showBanner={!locationEnabled}
        className="mb-6"
      />

      {/* Location Sorting Indicator */}
      {locationEnabled && filters.sortBy === 'distance' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-fixly-accent/10 to-teal-50 border-2 border-fixly-accent/20 rounded-xl p-4 mb-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-fixly-accent/20 rounded-full flex items-center justify-center mr-4">
                <MapPin className="h-5 w-5 text-fixly-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-fixly-text flex items-center">
                  🎯 Jobs sorted by proximity
                  {filters.maxDistance && (
                    <span className="ml-2 px-2 py-1 bg-fixly-accent/20 text-fixly-accent text-xs rounded-full">
                      Within {filters.maxDistance}km
                    </span>
                  )}
                </h3>
                <p className="text-sm text-fixly-text-muted">
                  Showing nearest opportunities first • {jobs.length} jobs found
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center text-sm text-fixly-accent">
              <div className="w-2 h-2 bg-fixly-accent rounded-full animate-pulse mr-2"></div>
              GPS Active
            </div>
          </div>
        </motion.div>
      )}

      {/* Search and Filters */}
      <div className="card mb-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search jobs by title, description, or location..."
                className="input-field pl-10 pr-10"
              />
              {searchLoading && (
                <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-fixly-accent" />
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center lg:w-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-fixly-text mr-2">Quick filters:</span>

          {/* Jobs Near Me Button */}
          {locationEnabled && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                handleFilterChange('sortBy', 'distance');
                handleFilterChange('maxDistance', 10); // 10km radius
              }}
              className={`btn-sm ${filters.sortBy === 'distance' && filters.maxDistance === 10
                ? 'bg-fixly-accent text-white'
                : 'bg-white border border-fixly-border text-fixly-text hover:border-fixly-accent'
              } flex items-center space-x-2`}
            >
              <Navigation className="h-3 w-3" />
              <span>Jobs Near Me</span>
            </motion.button>
          )}


          {/* Clear Quick Filters */}
          {(filters.sortBy === 'distance' && filters.maxDistance === 10) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                handleFilterChange('sortBy', 'newest');
                handleFilterChange('maxDistance', null);
              }}
              className="btn-sm bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center space-x-1"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </motion.button>
          )}
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-fixly-border pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    placeholder="City or state"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Budget Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={filters.budgetMin}
                      onChange={(e) => handleFilterChange('budgetMin', e.target.value)}
                      placeholder="Min"
                      className="input-field"
                    />
                    <input
                      type="number"
                      value={filters.budgetMax}
                      onChange={(e) => handleFilterChange('budgetMax', e.target.value)}
                      placeholder="Max"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Urgency
                  </label>
                  <select
                    value={filters.urgency}
                    onChange={(e) => handleFilterChange('urgency', e.target.value)}
                    className="select-field"
                  >
                    <option value="">All</option>
                    <option value="asap">ASAP</option>
                    <option value="flexible">Flexible</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                {/* Deadline Filter */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Deadline
                    </span>
                  </label>
                  <select
                    value={filters.deadlineFilter}
                    onChange={(e) => handleFilterChange('deadlineFilter', e.target.value)}
                    className="select-field"
                  >
                    <option value="">All deadlines</option>
                    <option value="today">Due today</option>
                    <option value="tomorrow">Due tomorrow</option>
                    <option value="week">Within a week</option>
                    <option value="month">Within a month</option>
                    <option value="custom">Custom range</option>
                  </select>
                </div>

                {/* Custom Date Range - Only show when custom is selected */}
                {filters.deadlineFilter === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-fixly-text mb-2">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filters.customDeadlineStart}
                        onChange={(e) => handleFilterChange('customDeadlineStart', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-fixly-text mb-2">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={filters.customDeadlineEnd}
                        onChange={(e) => handleFilterChange('customDeadlineEnd', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </>
                )}

                {/* Distance Filter - Only show when location is enabled */}
                {locationEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      <span className="flex items-center">
                        Distance Range
                        <span className="ml-1 text-xs text-green-600">(GPS enabled)</span>
                      </span>
                    </label>
                    <select
                      value={filters.maxDistance || ''}
                      onChange={(e) => handleFilterChange('maxDistance', e.target.value ? parseInt(e.target.value) : null)}
                      className="select-field"
                    >
                      <option value="">Any distance</option>
                      {DISTANCE_RANGES.slice(0, -1).map(range => (
                        <option key={range.value} value={range.value}>
                          {range.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Sort By
                    {locationEnabled && filters.sortBy === 'distance' && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <Navigation className="h-3 w-3 mr-1" />
                        GPS Active
                      </span>
                    )}
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className={`select-field ${filters.sortBy === 'distance' ? 'ring-2 ring-fixly-accent ring-opacity-50' : ''}`}
                  >
                    <option value="newest">🕐 Newest First</option>
                    <option value="deadline">📅 By Deadline</option>
                    <option value="budget_high">💰 Highest Budget</option>
                    <option value="budget_low">💸 Lowest Budget</option>
                    <option value="distance" disabled={!locationEnabled}>
                      {locationEnabled ? '📍 Nearest to Me' : '📍 Nearest to Me (Enable Location)'}
                    </option>
                  </select>
                  {filters.sortBy === 'distance' && locationEnabled && (
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                      Sorting by distance from your location
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={clearFilters}
                  className="text-fixly-accent hover:text-fixly-accent-dark text-sm"
                >
                  Clear all filters
                </button>
                
                <div className="text-sm text-fixly-text-muted">
                  {pagination.total} jobs found
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fixly-text mb-2">
            No jobs found
          </h3>
          <p className="text-fixly-text-muted mb-4">
            Try adjusting your search criteria or check back later for new opportunities.
          </p>
          <button
            onClick={clearFilters}
            className="btn-primary"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <JobCardRectangular
              key={job._id}
              job={job}
              user={user}
              onApply={handleQuickApply}
              isApplying={applyingJobs.has(job._id)}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {pagination.hasMore && jobs.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <Loader className="animate-spin h-4 w-4 mr-2" />
            ) : null}
            Load More Jobs
          </button>
        </div>
      )}

      {/* Upgrade Prompt for Free Users */}
      {user?.plan?.type !== 'pro' && user?.plan?.creditsUsed >= 3 && (
        <div className="fixed bottom-6 right-6 card max-w-sm border-fixly-accent shadow-fixly-lg">
          <div className="flex items-start">
            <TrendingUp className="h-6 w-6 text-fixly-accent mr-3 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-fixly-text mb-1">
                Upgrade to Pro
              </h4>
              <p className="text-sm text-fixly-text-muted mb-3">
                You&apos;ve used all free applications. Upgrade for unlimited access.
              </p>
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="btn-primary w-full text-sm"
              >
                Upgrade Now - ₹99/month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}