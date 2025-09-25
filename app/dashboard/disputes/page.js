'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Eye,
  MessageSquare,
  Calendar,
  DollarSign,
  User,
  Flag,
  Loader,
  AlertCircle,
  Shield,
  FileText,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export default function DisputesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    sortBy: 'createdAt',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  });

  useEffect(() => {
    if (session) {
      fetchDisputes();
    }
  }, [session, filters]);

  const fetchDisputes = async (page = 1) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy: filters.sortBy,
        sortOrder: 'desc'
      });

      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/disputes?${params}`);
      const data = await response.json();

      if (data.success) {
        if (page === 1) {
          setDisputes(data.disputes);
          setStatistics(data.statistics);
        } else {
          setDisputes(prev => [...prev, ...data.disputes]);
        }
        setPagination(data.pagination);
      } else {
        toast.error(data.message || 'Failed to fetch disputes');
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast.error('Failed to fetch disputes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      fetchDisputes(pagination.currentPage + 1);
    }
  };

  const getStatusIcon = (status) => {
    const iconClass = "h-4 w-4";
    switch (status) {
      case 'pending': return <Clock className={`${iconClass} text-yellow-500`} />;
      case 'under_review': return <Eye className={`${iconClass} text-blue-500`} />;
      case 'awaiting_response': return <MessageSquare className={`${iconClass} text-orange-500`} />;
      case 'in_mediation': return <Scale className={`${iconClass} text-fixly-primary`} />;
      case 'resolved': return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'escalated': return <Flag className={`${iconClass} text-red-500`} />;
      case 'closed': return <XCircle className={`${iconClass} text-gray-500`} />;
      case 'cancelled': return <XCircle className={`${iconClass} text-gray-400`} />;
      default: return <AlertTriangle className={`${iconClass} text-gray-400`} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'awaiting_response': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'in_mediation': return 'bg-fixly-accent/20 text-fixly-primary border-fixly-accent/30';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'escalated': return 'bg-red-100 text-red-800 border-red-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    const iconClass = "h-4 w-4";
    switch (category) {
      case 'payment_issue': return <DollarSign className={iconClass} />;
      case 'work_quality': return <Shield className={iconClass} />;
      case 'communication_problem': return <MessageSquare className={iconClass} />;
      case 'timeline_issue': return <Clock className={iconClass} />;
      case 'safety_concern': return <AlertTriangle className={iconClass} />;
      default: return <FileText className={iconClass} />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getOtherParty = (dispute) => {
    return dispute.initiatedBy._id === session.user.id 
      ? dispute.againstUser 
      : dispute.initiatedBy;
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
        <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-lg mr-4">
            <Scale className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fixly-text mb-1">
              Disputes
            </h1>
            <p className="text-fixly-text-light">
              Manage and track dispute resolutions
            </p>
          </div>
        </div>
      </div>

      {/* Statistics - Admin/Moderator only */}
      {statistics && (session.user.role === 'admin' || session.user.role === 'moderator') && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {[
            { 
              label: 'Total', 
              value: statistics.total, 
              icon: Scale, 
              color: 'blue' 
            },
            { 
              label: 'Pending', 
              value: statistics.pending, 
              icon: Clock, 
              color: 'yellow' 
            },
            { 
              label: 'In Review', 
              value: statistics.underReview, 
              icon: Eye, 
              color: 'blue' 
            },
            { 
              label: 'In Mediation', 
              value: statistics.inMediation, 
              icon: Scale, 
              color: 'teal' 
            },
            { 
              label: 'Resolved', 
              value: statistics.resolved, 
              icon: CheckCircle, 
              color: 'green' 
            }
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
      )}

      {/* Filters */}
      <div className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search disputes..."
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="select-field"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="awaiting_response">Awaiting Response</option>
            <option value="in_mediation">In Mediation</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="select-field"
          >
            <option value="all">All Categories</option>
            <option value="payment_issue">Payment Issue</option>
            <option value="work_quality">Work Quality</option>
            <option value="communication_problem">Communication</option>
            <option value="scope_disagreement">Scope Disagreement</option>
            <option value="timeline_issue">Timeline Issue</option>
            <option value="unprofessional_behavior">Unprofessional Behavior</option>
            <option value="safety_concern">Safety Concern</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            className="select-field"
          >
            <option value="createdAt">Most Recent</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="text-center py-12">
          <Scale className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fixly-text mb-2">
            No disputes found
          </h3>
          <p className="text-fixly-text-light">
            {filters.search || filters.status !== 'all' || filters.category !== 'all'
              ? 'Try adjusting your filters'
              : 'No disputes have been filed yet'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute, index) => {
            const otherParty = getOtherParty(dispute);
            const isInitiator = dispute.initiatedBy._id === session.user.id;
            
            return (
              <motion.div
                key={dispute._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/disputes/${dispute.disputeId}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-red-100 rounded-lg">
                        {getCategoryIcon(dispute.category)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-fixly-text truncate">
                          {dispute.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(dispute.status)}`}>
                          {dispute.status.replace(/_/g, ' ')}
                        </span>
                        {dispute.priority === 'high' && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            High Priority
                          </span>
                        )}
                        {dispute.priority === 'urgent' && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            Urgent
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-fixly-text-light mb-3">
                        <div className="flex items-center">
                          <span className="capitalize">{dispute.category.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(dispute.createdAt)}
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs">#{dispute.disputeId}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 bg-fixly-accent-light rounded-full flex items-center justify-center">
                              {otherParty.photoURL ? (
                                <img
                                  src={otherParty.photoURL}
                                  alt={otherParty.name}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-3 w-3 text-fixly-accent" />
                              )}
                            </div>
                            <span className="text-sm text-fixly-text-light">
                              {isInitiator ? 'Against' : 'From'}: {otherParty.name}
                            </span>
                          </div>
                          
                          {dispute.job && (
                            <div className="text-sm text-fixly-text-light">
                              Job: {dispute.job.title}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-3">
                          {dispute.amount && (dispute.amount.disputedAmount || dispute.amount.refundRequested || dispute.amount.additionalPaymentRequested) && (
                            <div className="flex items-center text-sm text-fixly-text-light">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ₹{(dispute.amount.disputedAmount || dispute.amount.refundRequested || dispute.amount.additionalPaymentRequested || 0).toLocaleString()}
                            </div>
                          )}
                          
                          {dispute.metadata.totalMessages > 0 && (
                            <div className="flex items-center text-sm text-fixly-text-light">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {dispute.metadata.totalMessages}
                            </div>
                          )}
                          
                          <div className="flex items-center text-sm text-fixly-text-light">
                            {getStatusIcon(dispute.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {pagination.hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-secondary flex items-center mx-auto"
          >
            {loadingMore ? (
              <Loader className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <TrendingUp className="h-5 w-5 mr-2" />
            )}
            {loadingMore ? 'Loading...' : 'Load More Disputes'}
          </button>
        </div>
      )}
    </div>
  );
}