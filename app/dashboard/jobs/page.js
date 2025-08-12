'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader,
  TrendingUp,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { usePageLoading } from '../../../contexts/LoadingContext';
import { GlobalLoading } from '../../../components/ui/GlobalLoading';
import { Briefcase } from 'lucide-react';

export default function JobsPage() {
  return (
    <RoleGuard roles={['hirer']} fallback={<div>Access denied</div>}>
      <JobsContent />
    </RoleGuard>
  );
}

function JobsContent() {
  const { user } = useApp();
  const router = useRouter();
  const { 
    loading: pageLoading, 
    showRefreshMessage, 
    startLoading, 
    stopLoading 
  } = usePageLoading('jobs');

  // Jobs data
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: true,
    total: 0,
    totalPages: 0,
    limit: 10
  });

  // Filters and tabs
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    completedJobs: 0
  });

  useEffect(() => {
    fetchJobs(true);
    fetchEarnings();
  }, [filters]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, status: activeTab }));
  }, [activeTab]);

  const fetchJobs = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        startLoading('Loading jobs...');
        setPagination(prev => ({ ...prev, page: 1 }));
      }

      const params = new URLSearchParams({
        page: reset ? '1' : pagination.page.toString(),
        limit: '10',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== 'all')
        )
      });

      const response = await fetch(`/api/jobs/post?${params}`);
      const text = await response.text();
      let data;
      
      try {
        data = text ? JSON.parse(text) : {};
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        data = {};
      }

      if (response.ok) {
        if (reset) {
          setJobs(data.jobs || []);
        } else {
          setJobs(prev => [...prev, ...(data.jobs || [])]);
        }
        setPagination(data.pagination || { page: 1, hasMore: false, total: 0, totalPages: 0, limit: 10 });
      } else {
        toast.error(data.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      fetchJobs(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await fetch('/api/user/earnings');
      if (response.ok) {
        const data = await response.json();
        setEarnings(data.earnings);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Job deleted successfully', {
          style: { background: 'green', color: 'white' }
        });
        setJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete job', {
          style: { background: 'red', color: 'white' }
        });
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job - network error', {
        style: { background: 'red', color: 'white' }
      });
    }
  };

  const handleRepostJob = async (job) => {
    try {
      // First, check if user can post (server will handle the 3-hour limit)
      const response = await fetch('/api/jobs/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${job.title} (Reposted)`,
          description: job.description,
          skillsRequired: job.skillsRequired,
          experienceLevel: job.experienceLevel,
          budget: job.budget,
          location: job.location,
          urgency: job.urgency,
          type: job.type,
          estimatedDuration: job.estimatedDuration,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
          scheduledDate: job.scheduledDate ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Job reposted successfully! You can now edit the details.', {
          style: { background: 'green', color: 'white' }
        });
        router.push(`/dashboard/jobs/${data.job._id}/edit`);
      } else {
        toast.error(data.message || 'Failed to repost job', {
          style: { background: 'red', color: 'white' }
        });
      }
    } catch (error) {
      console.error('Error reposting job:', error);
      toast.error('Failed to repost job - network error', {
        style: { background: 'red', color: 'white' }
      });
    }
  };


  const getStatusText = (job) => {
    switch (job.status) {
      case 'open': return `Open (${job.applications?.length || 0} applications)`;
      case 'in_progress': return 'In Progress';
      case 'completed': 
        if (job.completion?.confirmedAt) return 'Completed ✓';
        return 'Awaiting Confirmation';
      case 'cancelled': return 'Cancelled';
      case 'expired': return `Expired (${job.applications?.length || 0} applications)`;
      default: return job.status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
        <GlobalLoading 
          loading={pageLoading || loading}
          showRefreshMessage={showRefreshMessage}
          message="Loading your jobs..."
          fullScreen={false}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-fixly-text mb-2">
            My Jobs
          </h1>
          <p className="text-fixly-text-light">
            Manage your job postings and view applications
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          {user?.plan?.type !== 'pro' && (
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="btn-secondary flex items-center"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard/post-job')}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </button>
        </div>
      </div>

      {/* Earnings Overview for Completed Jobs */}
      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fixly-text-muted">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">₹{earnings.total?.toLocaleString() || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fixly-text-muted">This Month</p>
                <p className="text-2xl font-bold text-blue-600">₹{earnings.thisMonth?.toLocaleString() || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fixly-text-muted">Completed Jobs</p>
                <p className="text-2xl font-bold text-fixly-text">{earnings.completedJobs || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-fixly-accent" />
            </div>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="card mb-8">
        <div className="flex space-x-1 mb-6 p-1 bg-fixly-bg rounded-lg">
          {[
            { key: 'all', label: 'All Jobs', count: pagination.total },
            { key: 'open', label: 'Open', count: jobs.filter(j => j.status === 'open').length },
            { key: 'in_progress', label: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length },
            { key: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length },
            { key: 'expired', label: 'Expired', count: jobs.filter(j => j.status === 'expired').length },
            { key: 'cancelled', label: 'Cancelled', count: jobs.filter(j => j.status === 'cancelled').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-fixly-accent shadow-sm'
                  : 'text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-fixly-accent text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
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
                placeholder="Search jobs by title or description..."
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="select-field"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center lg:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        <div className="text-sm text-fixly-text-muted">
          {pagination.total || 0} jobs found
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fixly-text mb-2">
            No jobs posted yet
          </h3>
          <p className="text-fixly-text-muted mb-4">
            Post your first job to find skilled professionals
          </p>
          <button
            onClick={() => router.push('/dashboard/post-job')}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post Your First Job
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job, index) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`card card-hover ${
                job.status === 'expired' ? 'border-2 border-red-500 bg-red-50/50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(job.status)}`}>
                      {getStatusText(job)}
                    </span>
                    {job.featured && (
                      <span className="bg-fixly-accent text-fixly-text text-xs px-2 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    )}
                    {job.status === 'completed' && job.completion?.confirmedAt && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200">
                        ₹{job.budget?.amount?.toLocaleString() || 0} Paid
                      </span>
                    )}
                  </div>
                  
                  <h3 
                    className="text-xl font-semibold text-fixly-text mb-2 hover:text-fixly-accent cursor-pointer"
                    onClick={() => router.push(`/dashboard/jobs/${job._id}`)}
                  >
                    {job.title}
                  </h3>
                  
                  <p className="text-fixly-text-muted line-clamp-2 mb-3">
                    {job.description}
                  </p>

                  {/* Job Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center text-fixly-text-muted">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {job.budget.type === 'negotiable' 
                        ? 'Negotiable' 
                        : `₹${job.budget.amount?.toLocaleString()}`
                      }
                    </div>
                    
                    <div className="flex items-center text-fixly-text-muted">
                      <MapPin className="h-4 w-4 mr-1" />
                      {job.location.city}
                    </div>
                    
                    <div className="flex items-center text-fixly-text-muted">
                      <Clock className="h-4 w-4 mr-1" />
                      {getTimeRemaining(job.deadline)}
                    </div>
                    
                    <div className="flex items-center text-fixly-text-muted">
                      <Users className="h-4 w-4 mr-1" />
                      {job.applicationCount} applications
                    </div>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button className="p-2 hover:bg-fixly-accent/10 rounded-lg">
                    <MoreVertical className="h-4 w-4 text-fixly-text-muted" />
                  </button>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mb-4">
                {job.skillsRequired.slice(0, 3).map((skill, index) => (
                  <span key={index} className="skill-chip text-xs">
                    {skill}
                  </span>
                ))}
                {job.skillsRequired.length > 3 && (
                  <span className="text-xs text-fixly-text-muted">
                    +{job.skillsRequired.length - 3} more
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-fixly-border">
                <div className="flex items-center space-x-4 text-sm text-fixly-text-muted">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {job.views || 0} views
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/dashboard/jobs/${job._id}`)}
                    className="btn-ghost text-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                  
                  {job.status === 'open' && (
                    <button
                      onClick={() => router.push(`/dashboard/jobs/${job._id}/edit`)}
                      className="btn-secondary text-sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  )}

                  {job.status === 'expired' && (
                    <>
                      <button
                        onClick={() => handleRepostJob(job)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Repost
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
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
      {user?.plan?.type !== 'pro' && user?.jobsPosted >= 3 && (
        <div className="fixed bottom-6 right-6 card max-w-sm border-fixly-accent shadow-fixly-lg">
          <div className="flex items-start">
            <TrendingUp className="h-6 w-6 text-fixly-accent mr-3 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-fixly-text mb-1">
                Upgrade to Pro
              </h4>
              <p className="text-sm text-fixly-text-muted mb-3">
                You've posted multiple jobs. Upgrade for unlimited posting and priority support.
              </p>
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="btn-primary w-full text-sm"
              >
                Upgrade Now - ₹199/month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}