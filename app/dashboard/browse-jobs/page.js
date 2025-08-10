'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Filter,
  Star,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  Loader,
  RefreshCw,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  Send,
  Heart,
  Reply,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { searchCities, getAllSkills } from '../../../data/cities';

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
  
  // Comment state
  const [expandedJobComments, setExpandedJobComments] = useState(new Set());
  const [jobComments, setJobComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [submittingComments, setSubmittingComments] = useState(new Set());

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
    console.log('🎯 Quick Apply clicked for job:', jobId);
    console.log('👤 Current user:', { role: user?.role, creditsUsed: user?.plan?.creditsUsed });
    
    // Validate jobId
    if (!jobId) {
      console.error('❌ No job ID provided');
      toast.error('Invalid job ID. Please try again.');
      return;
    }
    
    if (!canUserApplyToJob(user)) {
      console.log('❌ User cannot apply to job');
      toast.error('You have used all free applications. Upgrade to Pro for unlimited access.');
      router.push('/dashboard/subscription');
      return;
    }

    // Set loading state for this specific job
    setApplyingJobs(prev => new Set([...prev, jobId]));
    console.log('⏳ Setting loading state for job:', jobId);

    try {
      const targetUrl = `/dashboard/jobs/${jobId}/apply`;
      console.log('🚀 Navigating to:', targetUrl);
      
      // First check if the job exists by making a quick API call
      const checkResponse = await fetch(`/api/jobs/${jobId}?forApplication=true`);
      if (!checkResponse.ok) {
        throw new Error(`Job not found or not accessible: ${checkResponse.status}`);
      }
      
      // Navigate to the application page
      router.push(targetUrl);
      toast.success('Opening application form...');
      
    } catch (error) {
      console.error('❌ Error navigating to application page:', error);
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

  // Comment functions
  const toggleComments = async (jobId) => {
    const isExpanded = expandedJobComments.has(jobId);
    
    if (isExpanded) {
      // Collapse comments
      setExpandedJobComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    } else {
      // Expand comments and fetch them
      setExpandedJobComments(prev => new Set([...prev, jobId]));
      await fetchJobComments(jobId);
    }
  };

  const fetchJobComments = async (jobId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setJobComments(prev => ({
          ...prev,
          [jobId]: data.comments || []
        }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const handleSubmitComment = async (jobId) => {
    const comment = newComments[jobId]?.trim();
    if (!comment) return;

    setSubmittingComments(prev => new Set([...prev, jobId]));

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment })
      });

      if (response.ok) {
        setNewComments(prev => ({ ...prev, [jobId]: '' }));
        await fetchJobComments(jobId); // Refresh comments
        toast.success('Comment posted!');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleLikeComment = async (jobId, commentId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await fetchJobComments(jobId); // Refresh to get updated likes
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDeleteComment = async (jobId, commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchJobComments(jobId); // Refresh comments
        toast.success('Comment deleted');
      } else {
        toast.error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  // Time formatting
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
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

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'asap': return 'text-red-600 bg-red-50 border-red-200';
      case 'flexible': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'scheduled': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {jobs.map((job, index) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card card-hover"
            >
              {/* Job Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {job.featured && (
                      <span className="bg-fixly-accent text-fixly-text text-xs px-2 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full border ${getUrgencyColor(job.urgency)}`}>
                      {job.urgency.toUpperCase()}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-fixly-text mb-2 hover:text-fixly-accent cursor-pointer">
                    {job.title}
                  </h3>
                  
                  <p className="text-sm text-fixly-text-muted line-clamp-2 mb-3">
                    {job.description}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mb-4">
                {job.skillsRequired.slice(0, 3).map((skill, index) => (
                  <span 
                    key={index} 
                    className={`skill-chip text-xs ${
                      user?.skills?.includes(skill.toLowerCase()) 
                        ? 'skill-chip-selected' 
                        : ''
                    }`}
                  >
                    {skill}
                  </span>
                ))}
                {job.skillsRequired.length > 3 && (
                  <span className="text-xs text-fixly-text-muted">
                    +{job.skillsRequired.length - 3} more
                  </span>
                )}
              </div>

              {/* Job Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-fixly-text-muted">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {job.budget.type === 'negotiable' 
                    ? 'Negotiable' 
                    : `₹${job.budget.amount?.toLocaleString()}`
                  }
                </div>
                
                <div className="flex items-center text-sm text-fixly-text-muted">
                  <MapPin className="h-4 w-4 mr-2" />
                  {job.location.city}, {job.location.state}
                  {job.isLocalJob && (
                    <span className="ml-2 text-green-600 text-xs">Local</span>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-fixly-text-muted">
                  <Clock className="h-4 w-4 mr-2" />
                  Deadline: {getTimeRemaining(job.deadline)}
                </div>
              </div>

              {/* Hirer Info */}
              <div className="flex items-center justify-between mb-4 pt-4 border-t border-fixly-border">
                <div className="flex items-center">
                  <img
                    src={job.createdBy.photoURL || '/default-avatar.png'}
                    alt={job.createdBy.name}
                    className="h-8 w-8 rounded-full object-cover mr-2"
                  />
                  <div>
                    <p className="text-sm font-medium text-fixly-text">
                      {job.createdBy.name}
                    </p>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-500 mr-1" />
                      <span className="text-xs text-fixly-text-muted">
                        {job.createdBy.rating?.average?.toFixed(1) || 'New'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-fixly-text-muted">
                  {job.applicationCount} applications
                </div>
              </div>

              {/* Match Score */}
              {job.skillMatchPercentage > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-fixly-text-muted">Skill Match</span>
                    <span className="font-medium text-fixly-text">
                      {Math.round(job.skillMatchPercentage)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${job.skillMatchPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex space-x-2">
                  {job.restrictedView ? (
                    <>
                      <button
                        disabled
                        className="btn-secondary flex-1 opacity-50"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Limited View
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/subscription')}
                        className="btn-primary flex-1"
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Upgrade to Apply
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleComments(job._id)}
                        className="flex-1 px-4 py-2 rounded-lg font-medium bg-white border-2 border-fixly-accent text-fixly-accent hover:bg-fixly-accent hover:text-white transition-colors"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {expandedJobComments.has(job._id) ? 'Hide Comments' : 'View Comments'}
                        {jobComments[job._id] && jobComments[job._id].length > 0 && (
                          <span className="ml-1 text-xs bg-fixly-accent text-white rounded-full px-1">
                            {jobComments[job._id].length}
                          </span>
                        )}
                      </button>
                      
                      {job.hasApplied ? (
                        <button
                          disabled
                          className="btn-ghost flex-1 opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Applied
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickApply(job._id)}
                          disabled={applyingJobs.has(job._id) || !canUserApplyToJob(user)}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            applyingJobs.has(job._id) || !canUserApplyToJob(user)
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-fixly-accent text-white hover:bg-fixly-accent-dark'
                          }`}
                          title={!canUserApplyToJob(user) ? 'You have reached your application limit' : 'Apply to this job'}
                        >
                          {applyingJobs.has(job._id) ? (
                            <Loader className="animate-spin h-4 w-4 mr-1" />
                          ) : (
                            <Zap className="h-4 w-4 mr-1" />
                          )}
                          Quick Apply
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Instagram-style Comments Section */}
                {expandedJobComments.has(job._id) && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {/* Comments List */}
                    <div className="max-h-60 overflow-y-auto space-y-3">
                      {jobComments[job._id] && jobComments[job._id].length > 0 ? (
                        jobComments[job._id].map((comment) => (
                          <div key={comment._id} className="flex space-x-2">
                            <img
                              src={comment.author?.photoURL || '/default-avatar.png'}
                              alt={comment.author?.name || 'User'}
                              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="bg-white rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm text-fixly-text">
                                    {comment.author?.name || 'Anonymous'}
                                  </span>
                                  <span className="text-xs text-fixly-text-muted">
                                    {getTimeAgo(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-fixly-text mt-1">{comment.message}</p>
                              </div>
                              
                              {/* Comment Actions */}
                              <div className="flex items-center space-x-4 mt-1 px-3">
                                <button
                                  onClick={() => handleLikeComment(job._id, comment._id)}
                                  className={`flex items-center space-x-1 text-xs ${
                                    comment.likes?.includes(user?._id) 
                                      ? 'text-red-500 font-medium' 
                                      : 'text-fixly-text-muted hover:text-red-500'
                                  } transition-colors`}
                                >
                                  <Heart className={`h-3 w-3 ${comment.likes?.includes(user?._id) ? 'fill-current' : ''}`} />
                                  <span>{comment.likes?.length || 0}</span>
                                </button>
                                
                                {comment.author?._id === user?._id && (
                                  <button
                                    onClick={() => handleDeleteComment(job._id, comment._id)}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-fixly-text-muted text-center py-4">
                          No comments yet. Be the first to comment!
                        </p>
                      )}
                    </div>

                    {/* Add Comment */}
                    <div className="flex space-x-2 pt-2 border-t">
                      <img
                        src={user?.photoURL || '/default-avatar.png'}
                        alt="You"
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={newComments[job._id] || ''}
                          onChange={(e) => setNewComments(prev => ({
                            ...prev,
                            [job._id]: e.target.value
                          }))}
                          placeholder="Add a comment..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSubmitComment(job._id);
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleSubmitComment(job._id)}
                        disabled={!newComments[job._id]?.trim() || submittingComments.has(job._id)}
                        className="px-3 py-2 bg-fixly-accent text-white rounded-full hover:bg-fixly-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingComments.has(job._id) ? (
                          <Loader className="animate-spin h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
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