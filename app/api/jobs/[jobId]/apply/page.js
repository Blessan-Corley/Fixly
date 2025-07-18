// app/dashboard/jobs/[jobId]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  User,
  Star,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle,
  Zap,
  Eye,
  Users,
  Loader,
  ArrowLeft,
  Flag,
  Share2,
  Heart,
  Bookmark
} from 'lucide-react';
import { useApp } from '../../../providers';
import { toast } from 'sonner';

export default function JobDetailsPage() {
  const { user } = useApp();
  const router = useRouter();
  const params = useParams();
  const { jobId } = params;

  // Job data
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [comments, setComments] = useState([]);

  // Application state
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    proposedAmount: '',
    timeEstimate: { value: '', unit: 'hours' },
    materialsList: [],
    coverLetter: ''
  });

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch job details
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      const jobData = await jobResponse.json();

      if (jobResponse.ok) {
        setJob(jobData.job);
        setComments(jobData.job.comments || []);
        
        // Increment view count if not the job creator
        if (user?.role !== 'hirer' || jobData.job.createdBy._id !== user._id) {
          fetch(`/api/jobs/${jobId}/view`, { method: 'POST' }).catch(console.error);
        }
      } else {
        toast.error(jobData.message || 'Failed to fetch job details');
        router.push('/dashboard');
        return;
      }

      // Fetch applications if user has permission
      if (user?.role === 'hirer' || user?.role === 'fixer') {
        try {
          const appsResponse = await fetch(`/api/jobs/${jobId}/apply`);
          const appsData = await appsResponse.json();
          
          if (appsResponse.ok) {
            setApplications(appsData.applications || []);
          }
        } catch (error) {
          console.error('Error fetching applications:', error);
        }
      }

    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to fetch job details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApply = async () => {
    if (!user?.canApplyToJob()) {
      toast.error('You have used all free applications. Upgrade to Pro for unlimited access.');
      router.push('/dashboard/subscription');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedAmount: job.budget.type === 'negotiable' ? 1000 : job.budget.amount,
          coverLetter: 'I am interested in this job and would like to discuss the details with you.'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Application sent successfully!');
        setJob(prev => ({ ...prev, hasApplied: true }));
        fetchJobDetails(); // Refresh to get updated application count
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

  const handleDetailedApply = async () => {
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
        toast.success('Detailed application sent successfully!');
        setShowApplicationForm(false);
        setJob(prev => ({ ...prev, hasApplied: true }));
        fetchJobDetails();
      } else {
        toast.error(data.message || 'Failed to apply');
      }
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to apply to job');
    } finally {
      setApplying(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    setSendingComment(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
        toast.success('Comment posted successfully');
      } else {
        toast.error(data.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSendingComment(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'disputed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'asap': return 'text-red-600';
      case 'flexible': return 'text-blue-600';
      case 'scheduled': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
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
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fixly-text mb-2">Job not found</h3>
          <p className="text-fixly-text-muted mb-4">
            This job may have been removed or you don't have permission to view it.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
          <button className="btn-ghost p-2">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="btn-ghost p-2">
            <Bookmark className="h-4 w-4" />
          </button>
          <button className="btn-ghost p-2">
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  {job.featured && (
                    <span className="bg-fixly-accent text-fixly-text text-xs px-2 py-1 rounded-full font-medium">
                      Featured
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`text-xs font-medium ${getUrgencyColor(job.urgency)}`}>
                    {job.urgency.toUpperCase()}
                  </span>
                </div>
                
                <h1 className="text-2xl font-bold text-fixly-text mb-2">
                  {job.title}
                </h1>
                
                <div className="flex items-center space-x-4 text-sm text-fixly-text-muted">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {job.location.city}, {job.location.state}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {getTimeRemaining(job.deadline)}
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {job.views || 0} views
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {job.applicationCount || 0} applications
                  </div>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="bg-fixly-accent/10 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-fixly-text-muted">Budget</span>
                  <div className="flex items-center mt-1">
                    <DollarSign className="h-5 w-5 text-fixly-text mr-1" />
                    <span className="text-xl font-bold text-fixly-text">
                      {job.budget.type === 'negotiable' 
                        ? 'Negotiable' 
                        : `₹${job.budget.amount?.toLocaleString()}`
                      }
                    </span>
                    {job.budget.type !== 'negotiable' && (
                      <span className="text-sm text-fixly-text-muted ml-2">
                        ({job.budget.type})
                      </span>
                    )}
                  </div>
                </div>
                {job.budget.materialsIncluded && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Materials Included
                  </span>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="mb-4">
              <h3 className="font-medium text-fixly-text mb-2">Skills Required</h3>
              <div className="flex flex-wrap gap-2">
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
                    {user?.skills?.includes(skill.toLowerCase()) && (
                      <CheckCircle className="h-3 w-3 ml-1" />
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Job Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-fixly-text-muted">Experience Level</span>
                <p className="font-medium text-fixly-text mt-1 capitalize">
                  {job.experienceLevel}
                </p>
              </div>
              <div>
                <span className="text-fixly-text-muted">Job Type</span>
                <p className="font-medium text-fixly-text mt-1 capitalize">
                  {job.type.replace('_', ' ')}
                </p>
              </div>
              <div>
                <span className="text-fixly-text-muted">Deadline</span>
                <p className="font-medium text-fixly-text mt-1">
                  {new Date(job.deadline).toLocaleDateString()}
                </p>
              </div>
              {job.estimatedDuration?.value && (
                <div>
                  <span className="text-fixly-text-muted">Duration</span>
                  <p className="font-medium text-fixly-text mt-1">
                    {job.estimatedDuration.value} {job.estimatedDuration.unit}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="card p-0">
            <div className="border-b border-fixly-border">
              <nav className="flex">
                {[
                  { id: 'details', label: 'Details', icon: AlertCircle },
                  { id: 'comments', label: 'Q&A', icon: MessageSquare, count: comments.length },
                  ...(user?.role === 'hirer' && job.createdBy._id === user._id 
                    ? [{ id: 'applications', label: 'Applications', icon: Users, count: applications.length }] 
                    : [])
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
                      <span className="ml-2 bg-fixly-accent/20 text-fixly-text px-2 py-1 rounded-full text-xs">
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-medium text-fixly-text mb-3">Description</h3>
                    <div className="prose prose-fixly max-w-none">
                      <p className="text-fixly-text-muted whitespace-pre-wrap">
                        {job.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-fixly-text mb-3">Location Details</h3>
                    <div className="bg-fixly-bg rounded-lg p-4">
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-fixly-accent mr-3 mt-1" />
                        <div>
                          <p className="font-medium text-fixly-text">{job.location.address}</p>
                          <p className="text-fixly-text-muted">
                            {job.location.city}, {job.location.state}
                            {job.location.pincode && ` - ${job.location.pincode}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {job.attachments && job.attachments.length > 0 && (
                    <div>
                      <h3 className="font-medium text-fixly-text mb-3">Attachments</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {job.attachments.map((attachment, index) => (
                          <div key={index} className="border border-fixly-border rounded-lg p-3">
                            <p className="font-medium text-fixly-text text-sm truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-fixly-text-muted">
                              {attachment.fileType}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-medium text-fixly-text mb-3">
                      Ask Questions About This Job
                    </h3>
                    <p className="text-sm text-fixly-text-muted mb-4">
                      Get clarification from the hirer before applying. All questions and answers are public.
                    </p>
                    
                    <div className="flex space-x-3">
                      <img
                        src={user?.photoURL || '/default-avatar.png'}
                        alt={user?.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Ask a question about this job..."
                          className="textarea-field mb-2"
                          rows={3}
                        />
                        <button
                          onClick={handleSendComment}
                          disabled={sendingComment || !newComment.trim()}
                          className="btn-primary"
                        >
                          {sendingComment ? (
                            <Loader className="animate-spin h-4 w-4 mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Post Question
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-fixly-text-muted mx-auto mb-3" />
                        <p className="text-fixly-text-muted">No questions yet. Be the first to ask!</p>
                      </div>
                    ) : (
                      comments.map((comment, index) => (
                        <div key={index} className="border border-fixly-border rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <img
                              src={comment.author.photoURL || '/default-avatar.png'}
                              alt={comment.author.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-fixly-text">
                                  {comment.author.name}
                                </span>
                                <span className="text-xs text-fixly-text-muted">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-fixly-text-muted">{comment.message}</p>
                              
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-3 ml-4 border-l-2 border-fixly-border pl-4">
                                  {comment.replies.map((reply, replyIndex) => (
                                    <div key={replyIndex} className="flex items-start space-x-3 mt-3">
                                      <img
                                        src={reply.author.photoURL || '/default-avatar.png'}
                                        alt={reply.author.name}
                                        className="h-6 w-6 rounded-full object-cover"
                                      />
                                      <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                          <span className="font-medium text-fixly-text text-sm">
                                            {reply.author.name}
                                          </span>
                                          <span className="text-xs text-fixly-text-muted">
                                            {new Date(reply.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <p className="text-sm text-fixly-text-muted">{reply.message}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* Applications Tab (only for job creators) */}
              {activeTab === 'applications' && user?.role === 'hirer' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-medium text-fixly-text mb-3">
                      Applications ({applications.length})
                    </h3>
                    
                    {applications.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-fixly-text-muted mx-auto mb-3" />
                        <p className="text-fixly-text-muted">No applications yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {applications.map((application, index) => (
                          <div key={index} className="border border-fixly-border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={application.fixer.photoURL || '/default-avatar.png'}
                                  alt={application.fixer.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                                <div>
                                  <h4 className="font-medium text-fixly-text">
                                    {application.fixer.name}
                                  </h4>
                                  <div className="flex items-center space-x-2 text-sm text-fixly-text-muted">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    <span>{application.fixer.rating?.average?.toFixed(1) || 'New'}</span>
                                    <span>•</span>
                                    <span>{application.fixer.jobsCompleted || 0} jobs completed</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-fixly-text">
                                  ₹{application.proposedAmount.toLocaleString()}
                                </div>
                                {application.timeEstimate && (
                                  <div className="text-sm text-fixly-text-muted">
                                    {application.timeEstimate.value} {application.timeEstimate.unit}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {application.coverLetter && (
                              <p className="text-fixly-text-muted mb-3">
                                {application.coverLetter}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-fixly-text-muted">
                                Applied {new Date(application.appliedAt).toLocaleDateString()}
                              </span>
                              
                              {application.status === 'pending' && (
                                <div className="flex space-x-2">
                                  <button className="btn-ghost text-sm">
                                    View Profile
                                  </button>
                                  <button className="btn-primary text-sm">
                                    Accept
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Hirer Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h3 className="font-medium text-fixly-text mb-4">Posted By</h3>
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={job.createdBy.photoURL || '/default-avatar.png'}
                alt={job.createdBy.name}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <h4 className="font-medium text-fixly-text">{job.createdBy.name}</h4>
                <div className="flex items-center space-x-1 text-sm text-fixly-text-muted">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span>{job.createdBy.rating?.average?.toFixed(1) || 'New'}</span>
                  <span>({job.createdBy.rating?.count || 0} reviews)</span>
                </div>
              </div>
            </div>
            
            {job.createdBy.isVerified && (
              <div className="flex items-center text-green-600 text-sm mb-4">
                <CheckCircle className="h-4 w-4 mr-1" />
                Verified Account
              </div>
            )}
            
            <button className="btn-ghost w-full">
              View Profile
            </button>
          </motion.div>

          {/* Action Buttons */}
          {user?.role === 'fixer' && job.status === 'open' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h3 className="font-medium text-fixly-text mb-4">Apply to this Job</h3>
              
              {job.hasApplied ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 font-medium mb-1">Application Sent</p>
                  <p className="text-sm text-fixly-text-muted">
                    You've already applied to this job
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleQuickApply}
                    disabled={applying || !user?.canApplyToJob()}
                    className="btn-primary w-full"
                  >
                    {applying ? (
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Quick Apply
                  </button>
                  
                  <button
                    onClick={() => setShowApplicationForm(true)}
                    className="btn-secondary w-full"
                  >
                    Detailed Application
                  </button>
                  
                  {!user?.canApplyToJob() && (
                    <p className="text-xs text-orange-600 text-center">
                      Upgrade to Pro for unlimited applications
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Job Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h3 className="font-medium text-fixly-text mb-4">Job Statistics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-fixly-text-muted">Applications</span>
                <span className="font-medium text-fixly-text">{job.applicationCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fixly-text-muted">Views</span>
                <span className="font-medium text-fixly-text">{job.views || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fixly-text-muted">Posted</span>
                <span className="font-medium text-fixly-text">
                  {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Application Form Modal */}
      <AnimatePresence>
        {showApplicationForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowApplicationForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-fixly-card rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-fixly-text mb-4">
                Apply to "{job.title}"
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Proposed Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={applicationData.proposedAmount}
                    onChange={(e) => setApplicationData(prev => ({
                      ...prev,
                      proposedAmount: e.target.value
                    }))}
                    placeholder="Enter your proposed amount"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Time Estimate
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={applicationData.timeEstimate.value}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        timeEstimate: { ...prev.timeEstimate, value: e.target.value }
                      }))}
                      placeholder="Duration"
                      className="input-field flex-1"
                    />
                    <select
                      value={applicationData.timeEstimate.unit}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        timeEstimate: { ...prev.timeEstimate, unit: e.target.value }
                      }))}
                      className="select-field w-24"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Cover Letter *
                  </label>
                  <textarea
                    value={applicationData.coverLetter}
                    onChange={(e) => setApplicationData(prev => ({
                      ...prev,
                      coverLetter: e.target.value
                    }))}
                    placeholder="Explain why you're the best fit for this job..."
                    className="textarea-field h-32"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowApplicationForm(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDetailedApply}
                  disabled={applying}
                  className="btn-primary flex-1"
                >
                  {applying ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Submit Application
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}