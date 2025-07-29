'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  User,
  Star,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Phone,
  Mail,
  Loader,
  Eye,
  Users,
  Briefcase,
  Heart,
  Share2,
  Flag,
  Edit,
  X,
  ThumbsUp,
  ThumbsDown,
  Send,
  Paperclip,
  Zap,
  Award,
  Shield,
  TrendingUp,
  Download,
  Image as ImageIcon,
  Camera,
  FileText,
  ExternalLink,
  Copy,
  MoreVertical
} from 'lucide-react';
import { useApp } from '../../../providers';
import { toast } from 'sonner';

export default function JobDetailsPage({ params }) {
  const { jobId } = params;
  const { user } = useApp();
  const router = useRouter();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [applications, setApplications] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Application form
  const [applicationData, setApplicationData] = useState({
    proposedAmount: '',
    timeEstimate: { value: '', unit: 'hours' },
    materialsList: [],
    coverLetter: ''
  });

  useEffect(() => {
    fetchJobDetails();
    trackJobView();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (response.ok) {
        setJob(data.job);
        
        // Fetch applications if user is job creator or applicant
        if (data.job.canMessage || user?.role === 'hirer') {
          fetchApplications();
        }
        
        // Fetch comments
        fetchComments();
      } else {
        toast.error(data.message || 'Failed to load job details');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const trackJobView = async () => {
    try {
      await fetch(`/api/jobs/${jobId}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleQuickApply = async () => {
    if (!user?.canApplyToJob()) {
      toast.error('You need to upgrade to Pro to apply to more jobs');
      router.push('/dashboard/subscription');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedAmount: job.budget.amount || 1000,
          coverLetter: 'I am interested in this job and would like to discuss the details.'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Quick application sent! Complete your proposal to increase your chances.');
        setJob(prev => ({ ...prev, hasApplied: true }));
        setShowApplicationModal(true);
      } else {
        if (data.needsUpgrade) {
          router.push('/dashboard/subscription');
        }
        toast.error(data.message || 'Failed to apply');
      }
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to apply to job');
    } finally {
      setApplying(false);
    }
  };

  const handleDetailedApplication = async () => {
    if (!applicationData.proposedAmount || !applicationData.coverLetter) {
      toast.error('Please fill in all required fields');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Detailed application submitted successfully!');
        setJob(prev => ({ ...prev, hasApplied: true }));
        setShowApplicationModal(false);
        fetchApplications();
      } else {
        toast.error(data.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationAction = async (applicationId, action) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'accept' ? 'accept_application' : 'reject_application',
          data: { applicationId }
        })
      });

      if (response.ok) {
        toast.success(`Application ${action}ed successfully`);
        fetchJobDetails();
        fetchApplications();
      } else {
        const data = await response.json();
        toast.error(data.message || `Failed to ${action} application`);
      }
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
      toast.error(`Failed to ${action} application`);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment })
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
        toast.success('Comment posted');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
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

  const shareJob = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title,
          text: job.description.substring(0, 100) + '...',
          url: url
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Job link copied to clipboard');
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

  if (!job) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-fixly-text mb-2">Job Not Found</h2>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isJobCreator = user?._id === job.createdBy._id;
  const isAssignedFixer = user?._id === job.assignedTo?._id;
  const userApplication = applications.find(app => app.fixer._id === user?._id);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="btn-ghost flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={shareJob}
            className="btn-ghost flex items-center"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </button>
          
          {!isJobCreator && (
            <button
              onClick={() => setShowReportModal(true)}
              className="btn-ghost text-red-600 hover:bg-red-50 flex items-center"
            >
              <Flag className="h-4 w-4 mr-1" />
              Report
            </button>
          )}
          
          {isJobCreator && job.status === 'open' && (
            <button
              onClick={() => router.push(`/dashboard/jobs/${jobId}/edit`)}
              className="btn-secondary flex items-center"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Job Header */}
      <div className="card mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              {job.featured && (
                <span className="bg-fixly-accent text-fixly-text text-xs px-2 py-1 rounded-full font-medium">
                  Featured
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full border ${getUrgencyColor(job.urgency)}`}>
                {job.urgency.toUpperCase()}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                job.status === 'open' ? 'bg-green-100 text-green-800' :
                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {job.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-fixly-text mb-3">
              {job.title}
            </h1>
            
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
                {job.location.city}, {job.location.state}
                {job.isLocalJob && (
                  <span className="ml-2 text-green-600 text-xs">Local</span>
                )}
              </div>
              
              <div className="flex items-center text-fixly-text-muted">
                <Clock className="h-4 w-4 mr-1" />
                Deadline: {getTimeRemaining(job.deadline)}
              </div>
              
              <div className="flex items-center text-fixly-text-muted">
                <Users className="h-4 w-4 mr-1" />
                {job.applicationCount} applications
              </div>
            </div>
          </div>

          {/* Skill Match Badge for Fixers */}
          {user?.role === 'fixer' && job.skillMatchPercentage > 0 && (
            <div className="ml-6 text-center">
              <div className="text-2xl font-bold text-fixly-accent">
                {Math.round(job.skillMatchPercentage)}%
              </div>
              <div className="text-xs text-fixly-text-muted">
                Skill Match
              </div>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {job.skillsRequired.map((skill, index) => (
            <span 
              key={index} 
              className={`skill-chip ${
                user?.skills?.includes(skill.toLowerCase()) 
                  ? 'skill-chip-selected' 
                  : ''
              }`}
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Actions */}
        {user?.role === 'fixer' && job.status === 'open' && (
          <div className="flex space-x-3">
            {job.hasApplied ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                Application Sent
              </div>
            ) : (
              <>
                <button
                  onClick={handleQuickApply}
                  disabled={applying || !user?.canApplyToJob()}
                  className="btn-primary flex items-center"
                >
                  {applying ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Quick Apply
                </button>
                
                <button
                  onClick={() => setShowApplicationModal(true)}
                  className="btn-secondary flex items-center"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Detailed Application
                </button>
              </>
            )}
            
            {job.canMessage && (
              <button
                onClick={() => router.push(`/dashboard/jobs/${jobId}/messages`)}
                className="btn-ghost flex items-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Hirer
              </button>
            )}
          </div>
        )}

        {/* Actions for Job Creator */}
        {isJobCreator && (
          <div className="flex space-x-3">
            {job.status === 'open' && applications.length > 0 && (
              <button
                onClick={() => setActiveTab('applications')}
                className="btn-primary flex items-center"
              >
                <Users className="h-4 w-4 mr-2" />
                Review Applications ({applications.length})
              </button>
            )}
            
            {job.status === 'in_progress' && (
              <button
                onClick={() => router.push(`/dashboard/jobs/${jobId}/messages`)}
                className="btn-secondary flex items-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Fixer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card p-0 mb-8">
        <div className="border-b border-fixly-border">
          <nav className="flex">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'applications', label: 'Applications', icon: Users, count: applications.length },
              { id: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-fixly-accent text-fixly-accent'
                    : 'border-transparent text-fixly-text-muted hover:text-fixly-text'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-fixly-accent/20 text-fixly-accent px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-fixly-text mb-4">
                    Job Description
                  </h3>
                  <div className="prose prose-fixly max-w-none">
                    <p className="text-fixly-text-light leading-relaxed whitespace-pre-wrap">
                      {job.description}
                    </p>
                  </div>
                </div>

                {/* Location Details */}
                <div>
                  <h3 className="text-lg font-semibold text-fixly-text mb-4">
                    Location
                  </h3>
                  <div className="bg-fixly-bg p-4 rounded-lg">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-fixly-accent mr-3 mt-1" />
                      <div>
                        <p className="font-medium text-fixly-text">
                          {job.location.city}, {job.location.state}
                        </p>
                        {job.location.address && (
                          <p className="text-fixly-text-muted text-sm mt-1">
                            {job.location.address}
                          </p>
                        )}
                        {job.location.pincode && (
                          <p className="text-fixly-text-muted text-sm">
                            PIN: {job.location.pincode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Requirements */}
                {(job.estimatedDuration?.value || job.experienceLevel !== 'intermediate') && (
                  <div>
                    <h3 className="text-lg font-semibold text-fixly-text mb-4">
                      Requirements
                    </h3>
                    <div className="space-y-3">
                      {job.estimatedDuration?.value && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-fixly-accent mr-3" />
                          <span className="text-fixly-text">
                            Estimated Duration: {job.estimatedDuration.value} {job.estimatedDuration.unit}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Award className="h-4 w-4 text-fixly-accent mr-3" />
                        <span className="text-fixly-text">
                          Experience Level: {job.experienceLevel.charAt(0).toUpperCase() + job.experienceLevel.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Budget Details */}
                <div className="card">
                  <h3 className="font-semibold text-fixly-text mb-4">Budget</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Type</span>
                      <span className="font-medium text-fixly-text capitalize">
                        {job.budget.type}
                      </span>
                    </div>
                    
                    {job.budget.type !== 'negotiable' && (
                      <div className="flex items-center justify-between">
                        <span className="text-fixly-text-muted">Amount</span>
                        <span className="font-medium text-fixly-text">
                          ₹{job.budget.amount?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Materials</span>
                      <span className="text-sm text-fixly-text">
                        {job.budget.materialsIncluded ? 'Included' : 'Not Included'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timing */}
                <div className="card">
                  <h3 className="font-semibold text-fixly-text mb-4">Timing</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Posted</span>
                      <span className="text-sm text-fixly-text">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Deadline</span>
                      <span className="text-sm text-fixly-text">
                        {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Urgency</span>
                      <span className="text-sm text-fixly-text capitalize">
                        {job.urgency}
                      </span>
                    </div>
                    
                    {job.scheduledDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-fixly-text-muted">Scheduled</span>
                        <span className="text-sm text-fixly-text">
                          {new Date(job.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hirer Info */}
                <div className="card">
                  <h3 className="font-semibold text-fixly-text mb-4">Posted By</h3>
                  <div className="flex items-center mb-3">
                    <img
                      src={job.createdBy.photoURL || '/default-avatar.png'}
                      alt={job.createdBy.name}
                      className="h-12 w-12 rounded-full object-cover mr-3"
                    />
                    <div>
                      <p className="font-medium text-fixly-text">
                        {job.createdBy.name}
                      </p>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm text-fixly-text-muted">
                          {job.createdBy.rating?.average?.toFixed(1) || 'New'} 
                          {job.createdBy.rating?.count && ` (${job.createdBy.rating.count} reviews)`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-fixly-text-muted">
                    <p>{job.createdBy.location?.city}, {job.createdBy.location?.state}</p>
                    {job.createdBy.isVerified && (
                      <div className="flex items-center text-green-600">
                        <Shield className="h-4 w-4 mr-1" />
                        Verified
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Stats */}
                <div className="card">
                  <h3 className="font-semibold text-fixly-text mb-4">Job Stats</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Views</span>
                      <span className="text-sm text-fixly-text">
                        {job.views || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Applications</span>
                      <span className="text-sm text-fixly-text">
                        {job.applicationCount || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-fixly-text-muted">Type</span>
                      <span className="text-sm text-fixly-text capitalize">
                        {job.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div>
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-fixly-text mb-2">
                    No applications yet
                  </h3>
                  <p className="text-fixly-text-muted">
                    Applications will appear here when fixers apply to this job.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {applications.map((application) => (
                    <div key={application._id} className="card">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <img
                            src={application.fixer.photoURL || '/default-avatar.png'}
                            alt={application.fixer.name}
                            className="h-12 w-12 rounded-full object-cover mr-4"
                          />
                          <div>
                            <h4 className="font-semibold text-fixly-text">
                              {application.fixer.name}
                            </h4>
                            <div className="flex items-center space-x-3 text-sm text-fixly-text-muted">
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                {application.fixer.rating?.average?.toFixed(1) || '0.0'}
                              </div>
                              <span>•</span>
                              <span>{application.fixer.jobsCompleted || 0} jobs completed</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-fixly-text">
                            ₹{application.proposedAmount?.toLocaleString()}
                          </div>
                          // ...previous code

                          {application.timeEstimate && (
                            <div className="text-sm text-fixly-text-muted">
                              {application.timeEstimate.value} {application.timeEstimate.unit}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cover Letter */}
                      <p className="text-fixly-text mt-4 whitespace-pre-wrap">
                        {application.coverLetter}
                      </p>

                      {/* Action Buttons */}
                      {isJobCreator && job.status === 'open' && (
                        <div className="mt-4 flex space-x-3">
                          <button
                            onClick={() => handleApplicationAction(application._id, 'accept')}
                            className="btn-primary"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleApplicationAction(application._id, 'reject')}
                            className="btn-secondary"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment._id} className="card">
                    <div className="flex items-start">
                      <img
                        src={comment.user.profilePhoto || '/default-avatar.png'}
                        alt={comment.user.name}
                        className="h-10 w-10 rounded-full object-cover mr-4"
                      />
                      <div>
                        <p className="font-semibold text-fixly-text">
                          {comment.user.name}
                        </p>
                        <p className="text-sm text-fixly-text-muted">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-2 text-fixly-text">
                          {comment.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              {user && (
                <div className="card">
                  <h4 className="font-semibold text-fixly-text mb-2">Add a Comment</h4>
                  <textarea
                    rows={3}
                    className="w-full border border-fixly-border rounded-lg p-2 mb-2"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your comment here..."
                  />
                  <button
                    onClick={handleAddComment}
                    className="btn-primary"
                  >
                    Post Comment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
