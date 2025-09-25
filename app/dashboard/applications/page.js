'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Clock,
  DollarSign,
  MapPin,
  Star,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  MessageSquare,
  Filter,
  Search,
  Loader,
  Calendar
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';

export default function ApplicationsPage() {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <ApplicationsContent />
    </RoleGuard>
  );
}

function ApplicationsContent() {
  const { user } = useApp();
  const router = useRouter();
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    completedJobs: 0
  });

  useEffect(() => {
    fetchApplications();
    fetchEarnings();
  }, [filters]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, status: activeTab }));
  }, [activeTab]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filters.status !== 'all' ? filters.status : '',
        search: filters.search
      });

      const response = await fetch(`/api/fixer/applications?${params}`);
      const data = await response.json();

      if (response.ok) {
        setApplications(data.applications || []);
      } else {
        toast.error(data.message || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'withdrawn': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'withdrawn': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const withdrawApplication = async (jobId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/applications/withdraw`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Application withdrawn successfully');
        fetchApplications();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to withdraw application');
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
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
            My Applications
          </h1>
          <p className="text-fixly-text-light">
            Track your job applications and their status
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <button
            onClick={() => router.push('/dashboard/browse-jobs')}
            className="btn-primary flex items-center"
          >
            <Search className="h-4 w-4 mr-2" />
            Browse More Jobs
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Applications', value: applications.length, icon: Briefcase, color: 'blue' },
          { label: 'Pending', value: applications.filter(a => a.status === 'pending').length, icon: Clock, color: 'yellow' },
          { label: 'Accepted', value: applications.filter(a => a.status === 'accepted').length, icon: CheckCircle, color: 'green' },
          { label: 'Success Rate', value: applications.length > 0 ? Math.round((applications.filter(a => a.status === 'accepted').length / applications.length) * 100) + '%' : '0%', icon: Star, color: 'teal' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center">
              <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  {stat.value}
                </div>
                <div className="text-sm text-fixly-text-muted">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search applications..."
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="select-field"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fixly-text mb-2">
            No applications yet
          </h3>
          <p className="text-fixly-text-muted mb-4">
            Start applying to jobs to see them here
          </p>
          <button
            onClick={() => router.push('/dashboard/browse-jobs')}
            className="btn-primary"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((application, index) => (
            <motion.div
              key={application._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`text-xs px-3 py-1 rounded-full border flex items-center ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      <span className="ml-1">{application.status.toUpperCase()}</span>
                    </span>
                    {application.job?.featured && (
                      <span className="bg-fixly-accent text-fixly-text text-xs px-2 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  <h3 
                    className="text-xl font-semibold text-fixly-text mb-2 hover:text-fixly-accent cursor-pointer"
                    onClick={() => router.push(`/dashboard/jobs/${application.job._id}`)}
                  >
                    {application.job?.title}
                  </h3>
                  
                  <p className="text-fixly-text-muted line-clamp-2 mb-3">
                    {application.job?.description}
                  </p>

                  {/* Application Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center text-fixly-text-muted">
                      <DollarSign className="h-4 w-4 mr-1" />
                      ₹{application.proposedAmount?.toLocaleString() || 'Not specified'}
                    </div>
                    
                    <div className="flex items-center text-fixly-text-muted">
                      <MapPin className="h-4 w-4 mr-1" />
                      {application.job?.location?.city}
                    </div>
                    
                    <div className="flex items-center text-fixly-text-muted">
                      <Calendar className="h-4 w-4 mr-1" />
                      Applied {new Date(application.appliedAt).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center text-fixly-text-muted">
                      <Clock className="h-4 w-4 mr-1" />
                      {application.timeEstimate ? `${application.timeEstimate.value} ${application.timeEstimate.unit}` : 'Not specified'}
                    </div>
                  </div>

                  {/* Cover Letter */}
                  {application.coverLetter && (
                    <div className="bg-fixly-bg p-3 rounded-lg mb-4">
                      <h4 className="font-medium text-fixly-text mb-2">Cover Letter:</h4>
                      <p className="text-sm text-fixly-text-muted">
                        {application.coverLetter}
                      </p>
                    </div>
                  )}

                  {/* Hirer Info */}
                  <div className="flex items-center pt-4 border-t border-fixly-border">
                    <img
                      src={application.job?.createdBy?.photoURL || '/default-avatar.png'}
                      alt={application.job?.createdBy?.name}
                      className="h-8 w-8 rounded-full object-cover mr-3"
                    />
                    <div>
                      <p className="text-sm font-medium text-fixly-text">
                        {application.job?.createdBy?.name}
                      </p>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs text-fixly-text-muted">
                          {application.job?.createdBy?.rating?.average?.toFixed(1) || 'New'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/dashboard/jobs/${application.job._id}`)}
                  className="btn-secondary flex items-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Job
                </button>
                
                {application.status === 'accepted' && (
                  <button
                    onClick={() => router.push(`/dashboard/jobs/${application.job._id}/messages`)}
                    className="btn-primary flex items-center"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message Hirer
                  </button>
                )}
                
                {application.status === 'pending' && (
                  <button
                    onClick={() => withdrawApplication(application.job._id)}
                    className="btn-ghost text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Withdraw
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}