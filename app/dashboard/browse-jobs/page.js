'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  AlertCircle,
  Loader,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { searchCities, getAllSkills } from '../../../data/cities';
import JobCardRectangular from '../../../components/JobCardRectangular';

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

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    skills: [],
    location: '',
    budgetMin: '',
    budgetMax: '',
    urgency: '',
    deadline: '',
    sortBy: 'newest'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Application state
  const [applyingJobs, setApplyingJobs] = useState(new Set());
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);

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

      const response = await fetch(`/api/jobs/browse?${params}`);
      
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
        if (reset) {
          setJobs(data.jobs);
        } else {
          setJobs(prev => [...prev, ...data.jobs]);
        }
        setPagination(data.pagination);
      } else {
        toast.error(data.message || 'Failed to fetch jobs');
      }
    } catch (error) {
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

    try {
      const targetUrl = `/dashboard/jobs/${jobId}/apply`;
      
      // First check if the job exists by making a quick API call
      const checkResponse = await fetch(`/api/jobs/${jobId}?forApplication=true`);
      if (!checkResponse.ok) {
        throw new Error(`Job not found or not accessible: ${checkResponse.status}`);
      }
      
      // Navigate to the application page
      router.push(targetUrl);
      toast.success('Opening application form...');
      
    } catch (error) {
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
      sortBy: 'newest'
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

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="select-field"
                  >
                    <option value="newest">Newest First</option>
                    <option value="deadline">Deadline</option>
                    <option value="budget_high">Highest Budget</option>
                    <option value="budget_low">Lowest Budget</option>
                    <option value="nearest">Nearest to Me</option>
                  </select>
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
                You've used all free applications. Upgrade for unlimited access.
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