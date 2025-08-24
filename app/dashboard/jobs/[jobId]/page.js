'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { canApplyToJob, getRemainingApplications } from '@/utils/creditUtils';
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
import InstagramCommentsRealtime from '../../../../components/InstagramCommentsRealtime';

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
  const [showInstagramComments, setShowInstagramComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingData, setRatingData] = useState({
    rating: 0,
    review: '',
    categories: {
      communication: 0,
      quality: 0,
      timeliness: 0,
      professionalism: 0
    }
  });
  
  // Instagram-style comment states
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Application form
  const [applicationData, setApplicationData] = useState({
    proposedAmount: '',
    budgetBreakdown: {
      enabled: false,
      laborCost: '',
      materialsCost: '',
      serviceFee: ''
    },
    timeEstimate: { value: '', unit: 'hours' },
    materialsList: [],
    coverLetter: '',
    workPlan: '',
    materialsIncluded: false,
    requirements: '',
    specialNotes: ''
  });

  // Image lightbox states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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
        toast.error('Unable to load job');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Connection error');
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
    if (!canApplyToJob(user)) {
      toast.error('Free applications used up - Upgrade to Pro');
      router.push('/dashboard/subscription');
      return;
    }

    // Show confirmation modal first
    setShowConfirmModal(true);
  };

  const confirmApplication = async () => {
    setApplying(true);
    setShowConfirmModal(false);
    
    try {
      const defaultAmount = job.budget.type === 'negotiable' ? 1000 : job.budget.amount || 1000;
      
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedAmount: defaultAmount,
          coverLetter: 'I am interested in this job and would like to discuss the details.'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('✅ Application sent');
        setJob(prev => ({ ...prev, hasApplied: true }));
        fetchApplications(); // Refresh applications
        
        // Refresh user data to update credits
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      } else {
        if (data.needsUpgrade) {
          router.push('/dashboard/subscription');
        }
        toast.error('Application failed');
      }
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Connection error');
    } finally {
      setApplying(false);
    }
  };

  const handleDetailedApplication = async () => {
    if (!applicationData.proposedAmount || !applicationData.coverLetter || !applicationData.workPlan) {
      toast.error('Fill required fields: Amount, Work Plan, Cover Letter');
      return;
    }

    if (job.budget.type === 'negotiable' && applicationData.workPlan.length < 100) {
      toast.error('Work plan too short - need 100+ characters');
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
        toast.success('✅ Application submitted');
        setJob(prev => ({ ...prev, hasApplied: true }));
        setShowApplicationModal(false);
        fetchApplications();
        
        // Refresh user data to update credits
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      } else {
        toast.error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Connection error');
    } finally {
      setApplying(false);
    }
  };


  const handleJobAction = async (action) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          data: {}
        })
      });

      const data = await response.json();

      if (response.ok) {
        let message = '';
        switch (action) {
          case 'mark_in_progress':
            message = 'Job marked as in progress';
            break;
          case 'mark_completed':
            message = 'Job marked as completed';
            break;
          case 'confirm_completion':
            message = 'Job completion confirmed';
            // Show rating modal for completed jobs
            if (action === 'confirm_completion') {
              setShowRatingModal(true);
            }
            break;
          case 'confirm_progress':
            message = 'Progress confirmed';
            break;
          default:
            message = 'Action completed successfully';
        }
        toast.success(message);
        fetchJobDetails();
      } else {
        toast.error('Status update failed');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Connection error');
    }
  };

  // Enhanced sensitive information detection
  const containsSensitiveInfo = (text) => {
    if (!text) return false;
    
    // Phone number patterns (Indian and international)
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}|\b\d{10}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|call me|contact me|phone|mobile|whatsapp|wa\.me/gi;
    
    // Email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|email|mail me|gmail|yahoo|outlook/gi;
    
    // Address patterns
    const addressRegex = /address|location|meet me|come to|visit|house number|building|street|road|pin code|pincode|landmark/gi;
    
    // Social media and external contact
    const socialRegex = /instagram|facebook|twitter|telegram|discord|skype|zoom|meet\.google|teams/gi;
    
    // Direct meeting attempts
    const meetingRegex = /meet outside|offline|direct contact|personal meeting|outside app|bypass|direct deal/gi;
    
    return phoneRegex.test(text) || emailRegex.test(text) || addressRegex.test(text) || 
           socialRegex.test(text) || meetingRegex.test(text);
  };

  // Check if user can comment on job
  const canUserComment = (user, job) => {
    if (!user) return false;
    
    // Both fixers and hirers can comment on jobs
    if (user.role === 'hirer') {
      // Hirers can always comment on their own jobs or jobs they're involved with
      return true;
    }
    
    if (user.role === 'fixer') {
      // Pro fixers can always comment
      if (user.plan?.type === 'pro' && user.plan?.status === 'active') {
        return true;
      }
      
      // Free fixers can comment if they have applications left or have already applied to this job
      const applicationsUsed = user.plan?.creditsUsed || 0;
      const hasCredits = applicationsUsed < 3;
      const hasAppliedToJob = job?.hasApplied || false;
      
      return hasCredits || hasAppliedToJob;
    }
    
    return false;
  };

  const handleSubmitRating = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: ratingData.rating,
          review: ratingData.review,
          categories: ratingData.categories,
          ratedBy: user.role // 'hirer' or 'fixer'
        })
      });

      if (response.ok) {
        toast.success('✅ Rating submitted');
        setShowRatingModal(false);
        fetchJobDetails();
        
        // Reset rating data
        setRatingData({
          rating: 0,
          review: '',
          categories: {
            communication: 0,
            quality: 0,
            timeliness: 0,
            professionalism: 0
          }
        });
      } else {
        const data = await response.json();
        toast.error('Rating failed');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Connection error');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    // Check for sensitive information
    if (containsSensitiveInfo(newComment)) {
      toast.error('⚠️ No personal info in comments - use private messages');
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment })
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
        toast.success('✅ Comment added');
      } else {
        const data = await response.json();
        toast.error('Comment failed');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Connection error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return;
    
    // Check for sensitive information
    if (containsSensitiveInfo(replyText)) {
      toast.error('⚠️ No personal info in replies - use private messages');
      return;
    }

    setSubmittingReply(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, message: replyText })
      });

      if (response.ok) {
        setReplyText('');
        setReplyingTo(null);
        fetchComments();
        toast.success('✅ Reply added');
      } else {
        const data = await response.json();
        toast.error('Reply failed');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Connection error');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleLikeReply = async (commentId, replyId) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId })
      });

      if (response.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error liking reply:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchComments();
        toast.success('✅ Comment removed');
      } else {
        toast.error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Connection error');
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, replyId })
      });

      if (response.ok) {
        fetchComments();
        toast.success('✅ Reply removed');
      } else {
        toast.error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('Connection error');
    }
  };

  // Application management functions
  const handleAcceptApplication = async (applicationId) => {
    if (!confirm('Are you sure you want to accept this application? This will assign the job to this fixer and reject all other applications.')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_application',
          data: { applicationId }
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('✅ Application accepted');
        fetchJobDetails(); // Refresh job details
        fetchApplications(); // Refresh applications
      } else {
        toast.error('Accept failed');
      }
    } catch (error) {
      console.error('Error accepting application:', error);
      toast.error('Connection error');
    }
  };

  const handleRejectApplication = async (applicationId) => {
    if (!confirm('Are you sure you want to reject this application?')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_application',
          data: { applicationId }
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('✅ Application rejected');
        fetchApplications(); // Refresh applications
      } else {
        toast.error('Reject failed');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Connection error');
    }
  };

  const handleMessageFixer = (fixerId) => {
    router.push(`/dashboard/jobs/${jobId}/messages`);
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return time.toLocaleDateString();
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
      toast.success('✅ Link copied');
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
          <div className="space-y-3">
            {/* Credit Warning for Non-Pro Users */}
            {user?.plan?.type !== 'pro' && (user?.plan?.creditsUsed || 0) >= 3 && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                  <div>
                    <p className="font-medium text-orange-800">No Free Credits Left</p>
                    <p className="text-sm text-orange-700">
                      You've used all 3 free job applications. Upgrade to Pro for unlimited access.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard/subscription')}
                  className="mt-3 btn-primary text-sm"
                >
                  Upgrade to Pro - ₹99/month
                </button>
              </div>
            )}

            <div className="flex space-x-3">
              {job.hasApplied ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Application Sent
                </div>
              ) : (
                <>
                  {canApplyToJob(user) ? (
                    <>
                      <button
                        onClick={handleQuickApply}
                        disabled={applying}
                        className="btn-primary flex items-center"
                      >
                        {applying ? (
                          <Loader className="animate-spin h-4 w-4 mr-2" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        Apply
                      </button>
                      
                      <button
                        onClick={() => setShowApplicationModal(true)}
                        className="btn-secondary flex items-center"
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Detailed Application
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled
                        className="btn-disabled flex items-center opacity-50 cursor-not-allowed"
                        title="No credits left - upgrade to Pro"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Apply (No Credits)
                      </button>
                      
                      <button
                        onClick={() => router.push('/dashboard/subscription')}
                        className="btn-primary flex items-center"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Upgrade to Apply
                      </button>
                    </>
                  )}
                </>
              )}
              
              {job.canMessage && canApplyToJob(user) && (
                <button
                  onClick={() => router.push(`/dashboard/jobs/${jobId}/messages`)}
                  className="btn-ghost flex items-center"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Hirer
                </button>
              )}
              
              {!canApplyToJob(user) && (
                <div className="text-sm text-fixly-text-muted italic">
                  Messaging disabled - upgrade to Pro to message hirers
                </div>
              )}
            </div>
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
              <>
                <button
                  onClick={() => router.push(`/dashboard/jobs/${jobId}/messages`)}
                  className="btn-secondary flex items-center"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Fixer
                </button>
                
                <button
                  onClick={() => handleJobAction('confirm_progress')}
                  className="btn-ghost flex items-center text-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Progress
                </button>
              </>
            )}
            
            {job.status === 'completed' && !job.completion?.confirmedBy && (
              <button
                onClick={() => handleJobAction('confirm_completion')}
                className="btn-primary flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Completed
              </button>
            )}
            
            {job.status === 'completed' && job.completion?.confirmedBy && (
              <div className="space-y-2">
                {!job.completion?.hirerRating && (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="btn-secondary flex items-center"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Fixer
                  </button>
                )}
                
                {job.completion?.hirerRating && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="flex items-center text-green-700 text-sm">
                      <Star className="h-4 w-4 mr-1" />
                      <span>You rated this fixer {job.completion.hirerRating.rating}⭐</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions for Assigned Fixer */}
        {isAssignedFixer && (
          <div className="space-y-3">
            {/* Job Status Display */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">Job Status</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Assigned:</span>
                  <span className="text-green-600">✓ Job assigned to you</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Arrival:</span>
                  {job.progress?.arrivedAt ? (
                    <span className="text-green-600">✓ Arrived at {new Date(job.progress.arrivedAt).toLocaleString()}</span>
                  ) : (
                    <span className="text-gray-500">Not marked</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Progress:</span>
                  {job.progress?.startedAt ? (
                    <span className="text-green-600">✓ Work started at {new Date(job.progress.startedAt).toLocaleString()}</span>
                  ) : (
                    <span className="text-gray-500">Not started</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Completion:</span>
                  {job.progress?.completedAt ? (
                    <span className="text-green-600">✓ Completed at {new Date(job.progress.completedAt).toLocaleString()}</span>
                  ) : (
                    <span className="text-gray-500">Not completed</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/dashboard/jobs/${jobId}/messages`)}
                className="btn-secondary flex items-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Client
              </button>
              
              {job.status === 'in_progress' && (
                <>
                  {!job.progress?.arrivedAt && (
                    <button
                      onClick={() => handleJobAction('mark_arrived')}
                      className="btn-ghost flex items-center text-green-600"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      I've Arrived
                    </button>
                  )}
                  
                  {job.progress?.arrivedAt && !job.progress?.startedAt && (
                    <button
                      onClick={() => handleJobAction('mark_in_progress')}
                      className="btn-ghost flex items-center text-blue-600"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Start Work
                    </button>
                  )}
                  
                  {job.progress?.startedAt && (
                    <button
                      onClick={() => handleJobAction('mark_completed')}
                      className="btn-primary flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Done
                    </button>
                  )}
                </>
              )}
            </div>
            
            {job.status === 'completed' && !job.completion?.confirmedBy && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <div className="flex items-center text-green-700">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm">
                    Work completed! Waiting for client confirmation.
                  </span>
                </div>
              </div>
            )}
            
            {job.status === 'completed' && job.completion?.confirmedBy && (
              <div className="space-y-2">
                {!job.completion?.fixerRating && (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="btn-secondary flex items-center"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Client
                  </button>
                )}
                
                {job.completion?.fixerRating && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="flex items-center text-green-700 text-sm">
                      <Star className="h-4 w-4 mr-1" />
                      <span>You rated this client {job.completion.fixerRating.rating}⭐</span>
                    </div>
                  </div>
                )}
              </div>
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
                onClick={() => {
                  if (tab.id === 'comments') {
                    setShowInstagramComments(true);
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
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

                {/* Media Attachments */}
                {job.attachments && job.attachments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-fixly-text mb-4">
                      Photos & Videos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {job.attachments.map((attachment, index) => (
                        <div key={attachment.id || index} className="relative group">
                          {attachment.isImage ? (
                            <div 
                              className="relative bg-fixly-card border border-fixly-border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => {
                                setSelectedImage(attachment);
                                setShowImageModal(true);
                              }}
                            >
                              <img
                                src={attachment.url}
                                alt={attachment.name || `Image ${index + 1}`}
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {attachment.name && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                                  <p className="text-xs truncate">{attachment.name}</p>
                                </div>
                              )}
                            </div>
                          ) : attachment.isVideo ? (
                            <div className="relative bg-fixly-card border border-fixly-border rounded-lg overflow-hidden">
                              <div className="relative">
                                <video 
                                  id={`video-${attachment.id || index}`}
                                  className="w-full h-32 object-cover cursor-pointer"
                                  poster={attachment.thumbnail}
                                  preload="metadata"
                                  onClick={(e) => {
                                    const video = e.target;
                                    const playButton = video.parentElement.querySelector('.play-button');
                                    if (video.paused) {
                                      video.play();
                                      video.controls = true;
                                      if (playButton) playButton.style.display = 'none';
                                    } else {
                                      video.pause();
                                      video.controls = false;
                                      if (playButton) playButton.style.display = 'flex';
                                    }
                                  }}
                                  onEnded={(e) => {
                                    const video = e.target;
                                    const playButton = video.parentElement.querySelector('.play-button');
                                    video.controls = false;
                                    if (playButton) playButton.style.display = 'flex';
                                  }}
                                >
                                  <source src={attachment.url} type={attachment.type} />
                                  Your browser does not support the video tag.
                                </video>
                                <div className="play-button absolute inset-0 bg-black/20 flex items-center justify-center cursor-pointer pointer-events-none">
                                  <div className="w-12 h-12 bg-fixly-accent/80 rounded-full flex items-center justify-center hover:bg-fixly-accent transition-colors">
                                    <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                                  </div>
                                </div>
                              </div>
                              {attachment.name && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                                  <p className="text-xs truncate">{attachment.name}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="relative bg-fixly-card border border-fixly-border rounded-lg overflow-hidden p-4 h-32 flex items-center justify-center">
                              <div className="text-center">
                                <FileText className="h-8 w-8 text-fixly-accent mx-auto mb-2" />
                                <p className="text-sm text-fixly-text-muted truncate">{attachment.name || 'File'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-fixly-text-muted text-sm mt-3">
                      Click on videos to play them, images to view full size
                    </p>
                  </div>
                )}

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

                {/* Job Timeline */}
                <div>
                  <h3 className="text-lg font-semibold text-fixly-text mb-4">
                    Timeline
                  </h3>
                  <div className="bg-fixly-bg p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-fixly-accent mr-3" />
                        <span className="text-fixly-text-muted">Posted</span>
                      </div>
                      <span className="font-medium text-fixly-text">
                        {new Date(job.createdAt).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-red-500 mr-3" />
                        <span className="text-fixly-text-muted">Deadline</span>
                      </div>
                      <span className="font-medium text-fixly-text">
                        {new Date(job.deadline).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {job.scheduledDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-blue-500 mr-3" />
                          <span className="text-fixly-text-muted">Scheduled</span>
                        </div>
                        <span className="font-medium text-fixly-text">
                          {new Date(job.scheduledDate).toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-fixly-border">
                      <div className="flex items-center justify-between">
                        <span className="text-fixly-text-muted">Time remaining</span>
                        <span className={`font-semibold ${
                          getTimeRemaining(job.deadline) === 'Expired' ? 'text-red-600' : 
                          getTimeRemaining(job.deadline).includes('h') ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {getTimeRemaining(job.deadline)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job Type & Category */}
                <div>
                  <h3 className="text-lg font-semibold text-fixly-text mb-4">
                    Job Details
                  </h3>
                  <div className="bg-fixly-bg p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 text-fixly-accent mr-3" />
                        <span className="text-fixly-text-muted">Job Type</span>
                      </div>
                      <span className="font-medium text-fixly-text capitalize">
                        {job.type.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 text-fixly-accent mr-3" />
                        <span className="text-fixly-text-muted">Urgency</span>
                      </div>
                      <span className={`font-medium capitalize px-2 py-1 rounded text-xs ${
                        job.urgency === 'asap' ? 'bg-red-100 text-red-800' :
                        job.urgency === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {job.urgency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 text-fixly-accent mr-3" />
                        <span className="text-fixly-text-muted">Views</span>
                      </div>
                      <span className="font-medium text-fixly-text">
                        {job.views || 0} views
                      </span>
                    </div>
                  </div>
                </div>
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

                {/* Credit Status for Fixers */}
                {user?.role === 'fixer' && (
                  <div className="card">
                    <h3 className="font-semibold text-fixly-text mb-4">Your Credits</h3>
                    {user.plan?.type === 'pro' && user.plan?.status === 'active' ? (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">∞</div>
                        <p className="text-sm text-fixly-text">Unlimited Applications</p>
                        <div className="bg-green-50 border border-green-200 p-2 rounded-lg mt-3">
                          <p className="text-xs text-green-800">Pro Member</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-fixly-accent mb-2">
                          {Math.max(0, 3 - ((user.plan?.creditsUsed || 0)))}
                        </div>
                        <p className="text-sm text-fixly-text-muted">Free Applications Left</p>
                        
                        {(user.plan?.creditsUsed || 0) >= 3 ? (
                          <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mt-3">
                            <p className="text-xs text-orange-800 mb-2">No credits left!</p>
                            <button
                              onClick={() => router.push('/dashboard/subscription')}
                              className="btn-primary text-xs w-full"
                            >
                              Upgrade to Pro
                            </button>
                          </div>
                        ) : (
                          <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg mt-3">
                            <p className="text-xs text-blue-800">
                              Used {user.plan?.creditsUsed || 0} of 3 free applications
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              ⚠️ Credits deducted only when jobs are assigned to you
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                  {applications.map((application) => {
                    const isProUser = user?.plan?.type === 'pro' && user?.plan?.status === 'active';
                    const showFixerDetails = isProUser;
                    
                    return (
                      <div key={application._id} className="card">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <img
                            src={showFixerDetails ? (application.fixer.photoURL || '/default-avatar.png') : '/default-avatar.png'}
                            alt={showFixerDetails ? application.fixer.name : 'Fixer'}
                            className="h-12 w-12 rounded-full object-cover mr-4"
                          />
                          <div>
                            <h4 className="font-semibold text-fixly-text">
                              {showFixerDetails ? application.fixer.name : 'Professional Fixer'}
                            </h4>
                            <div className="flex items-center space-x-3 text-sm text-fixly-text-muted">
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                {showFixerDetails ? (application.fixer.rating?.average?.toFixed(1) || '0.0') : '★★★'}
                              </div>
                              <span>•</span>
                              <span>{showFixerDetails ? `${application.fixer.jobsCompleted || 0} jobs completed` : 'Experience available'}</span>
                              {!showFixerDetails && (
                                <span className="text-fixly-accent">• Upgrade to see details</span>
                              )}
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

                      {/* Application Details */}
                      <div className="mt-4 space-y-4">
                        {/* Work Plan */}
                        {application.workPlan && (
                          <div>
                            <h5 className="font-medium text-fixly-text mb-2">Work Plan & Approach</h5>
                            <p className="text-fixly-text-light whitespace-pre-wrap bg-fixly-bg p-3 rounded-lg">
                              {application.workPlan}
                            </p>
                          </div>
                        )}

                        {/* Cover Letter */}
                        {application.coverLetter && (
                          <div>
                            <h5 className="font-medium text-fixly-text mb-2">Why Choose This Fixer</h5>
                            <p className="text-fixly-text-light whitespace-pre-wrap">
                              {application.coverLetter}
                            </p>
                          </div>
                        )}

                        {/* Materials & Pricing Info */}
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-blue-900">Materials:</span>
                            <span className={`text-sm ${application.materialsIncluded ? 'text-green-600' : 'text-blue-600'}`}>
                              {application.materialsIncluded ? 'Included in price' : 'Additional cost'}
                            </span>
                          </div>
                          
                          {application.materialsList && application.materialsList.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-blue-900 mb-1">Materials List:</p>
                              {application.materialsList.map((material, idx) => (
                                <div key={idx} className="text-xs text-blue-800 flex justify-between">
                                  <span>{material.item} (x{material.quantity})</span>
                                  <span>₹{material.estimatedCost}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Requirements from Client */}
                        {application.requirements && (
                          <div>
                            <h5 className="font-medium text-fixly-text mb-2">What They Need from You</h5>
                            <p className="text-fixly-text-light whitespace-pre-wrap bg-orange-50 border border-orange-200 p-3 rounded-lg">
                              {application.requirements}
                            </p>
                          </div>
                        )}

                        {/* Special Notes */}
                        {application.specialNotes && (
                          <div>
                            <h5 className="font-medium text-fixly-text mb-2">Special Notes & Conditions</h5>
                            <p className="text-fixly-text-light whitespace-pre-wrap bg-green-50 border border-green-200 p-3 rounded-lg">
                              {application.specialNotes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-fixly-border mt-4">
                        <div className="text-sm text-fixly-text-muted">
                          Applied {getTimeAgo(application.appliedAt)}
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleMessageFixer(application.fixer._id)}
                            className="btn-ghost text-sm flex items-center"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Message
                          </button>
                          
                          {/* Show action buttons only if job is still open and application is pending */}
                          {job.status === 'open' && application.status === 'pending' && isJobCreator && (
                            <>
                              <button
                                onClick={() => handleRejectApplication(application._id)}
                                className="btn-ghost text-red-600 hover:bg-red-50 text-sm flex items-center"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Decline
                              </button>
                              <button
                                onClick={() => handleAcceptApplication(application._id)}
                                className="btn-primary text-sm flex items-center"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Accept & Hire
                              </button>
                            </>
                          )}
                          
                          {/* Show status if not pending */}
                          {application.status !== 'pending' && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              application.status === 'accepted' 
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Upgrade Prompt for Non-Pro Users */}
                      {!showFixerDetails && (
                        <div className="bg-gradient-to-r from-fixly-accent/10 to-purple-500/10 border border-fixly-accent/20 rounded-lg p-4 mt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <TrendingUp className="h-5 w-5 text-fixly-accent mr-2" />
                              <div>
                                <h5 className="font-semibold text-fixly-text">Upgrade to Pro to see fixer details</h5>
                                <p className="text-sm text-fixly-text-muted">Get full access to fixer profiles, ratings, and contact information</p>
                              </div>
                            </div>
                            <button
                              onClick={() => router.push('/dashboard/subscription')}
                              className="bg-fixly-accent hover:bg-fixly-accent-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Upgrade Now
                            </button>
                          </div>
                        </div>
                      )}
                      </div>
                    );
                  })}
                  
                  {/* Overall Upgrade Message for Non-Pro Users */}
                  {applications.length > 0 && user?.plan?.type !== 'pro' && (
                    <div className="text-center mt-6 p-6 bg-fixly-accent/5 rounded-lg border border-fixly-accent/20">
                      <TrendingUp className="h-12 w-12 text-fixly-accent mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-fixly-text mb-2">
                        Get More from Your Job Applications
                      </h3>
                      <p className="text-fixly-text-muted mb-4">
                        Upgrade to Pro to see complete fixer profiles, contact information, and make informed hiring decisions.
                      </p>
                      <button
                        onClick={() => router.push('/dashboard/subscription')}
                        className="bg-fixly-accent hover:bg-fixly-accent-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Upgrade to Pro - ₹199/month
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Comments Tab - Now redirects to Instagram-style modal */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment._id}>
                    {/* Main Comment */}
                    <div className="flex items-start space-x-3">
                      <img
                        src={comment.author?.photoURL || '/default-avatar.png'}
                        alt={comment.author?.name || 'User'}
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-semibold text-fixly-text text-sm">
                            {comment.author?.name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-fixly-text-muted">
                            {getTimeAgo(comment.createdAt)}
                          </p>
                        </div>
                        <p className="text-fixly-text text-sm break-words">
                          {comment.message}
                        </p>
                        
                        {/* Comment Actions */}
                        <div className="flex items-center space-x-4 mt-2">
                          <button
                            onClick={() => handleLikeComment(comment._id)}
                            className={`text-xs hover:text-fixly-accent transition-colors ${
                              comment.likes?.includes(user?._id) ? 'text-fixly-accent font-medium' : 'text-fixly-text-muted'
                            }`}
                          >
                            {comment.likes?.length || 0} likes
                          </button>
                          {canUserComment(user, job) && (
                            <button
                              onClick={() => setReplyingTo(comment._id)}
                              className="text-xs text-fixly-text-muted hover:text-fixly-accent transition-colors"
                            >
                              Reply
                            </button>
                          )}
                          {comment.author?._id === user?._id && (
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className="text-xs text-red-500 hover:text-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        
                        {/* Reply Input */}
                        {replyingTo === comment._id && canUserComment(user, job) && (
                          <div className="mt-3 flex items-start space-x-2">
                            <img
                              src={user?.photoURL || '/default-avatar.png'}
                              alt="You"
                              className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Reply to ${comment.author?.name || 'Anonymous'}...`}
                                className="w-full text-sm border-0 border-b border-fixly-border bg-transparent p-2 focus:outline-none focus:border-fixly-accent"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddReply(comment._id);
                                  }
                                }}
                              />
                              <div className="flex items-center space-x-2 mt-2">
                                <button
                                  onClick={() => handleAddReply(comment._id)}
                                  disabled={!replyText.trim() || submittingReply}
                                  className="text-xs btn-primary px-3 py-1"
                                >
                                  {submittingReply ? 'Posting...' : 'Post'}
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }}
                                  className="text-xs text-fixly-text-muted hover:text-fixly-text"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="flex items-start space-x-2">
                                <img
                                  src={reply.author?.photoURL || '/default-avatar.png'}
                                  alt={reply.author?.name || 'User'}
                                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <p className="font-semibold text-fixly-text text-xs">
                                      {reply.author?.name || 'Anonymous'}
                                    </p>
                                    <p className="text-xs text-fixly-text-muted">
                                      {getTimeAgo(reply.createdAt)}
                                    </p>
                                  </div>
                                  <p className="text-fixly-text text-xs break-words">
                                    {reply.message}
                                  </p>
                                  <div className="flex items-center space-x-3 mt-1">
                                    <button
                                      onClick={() => handleLikeReply(comment._id, reply._id)}
                                      className={`text-xs hover:text-fixly-accent transition-colors ${
                                        reply.likes?.includes(user?._id) ? 'text-fixly-accent font-medium' : 'text-fixly-text-muted'
                                      }`}
                                    >
                                      {reply.likes?.length || 0} likes
                                    </button>
                                    {reply.author?._id === user?._id && (
                                      <button
                                        onClick={() => handleDeleteReply(comment._id, reply._id)}
                                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              {user && (
                <div className="card">
                  <h4 className="font-semibold text-fixly-text mb-2">Add a Comment</h4>
                  
                  {/* Comment Restrictions */}
                  {!canUserComment(user, job) && (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-3">
                      <div className="flex items-center text-orange-800 text-sm">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span>
                          {user?.role === 'fixer' 
                            ? 'Comments are restricted. Upgrade to Pro or have credits to comment on jobs.'
                            : 'You must be signed in to comment on jobs.'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <textarea
                    rows={3}
                    className="w-full border border-fixly-border rounded-lg p-2 mb-2"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      !canUserComment(user, job)
                        ? "Sign in and meet requirements to comment..." 
                        : "Type your comment here..."
                    }
                    disabled={!canUserComment(user, job)}
                  />
                  <button
                    onClick={handleAddComment}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      !canUserComment(user, job) 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-fixly-accent text-white hover:bg-fixly-accent-dark'
                    }`}
                    disabled={!canUserComment(user, job) || submittingComment}
                  >
                    {submittingComment ? (
                      <>
                        <Loader className="animate-spin h-4 w-4 mr-2 inline" />
                        Posting...
                      </>
                    ) : (
                      !canUserComment(user, job) ? 'Cannot Comment' : 'Post Comment'
                    )}
                  </button>
                  
                  {user?.role === 'fixer' && !canApplyToJob(user) && !job.hasApplied && (
                    <button
                      onClick={() => router.push('/dashboard/subscription')}
                      className="ml-2 btn-secondary text-sm"
                    >
                      Upgrade Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-fixly-text">
                  Confirm Application
                </h2>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-fixly-text-muted hover:text-fixly-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Job Summary */}
                <div className="bg-fixly-bg p-4 rounded-lg">
                  <h3 className="font-medium text-fixly-text mb-2">{job.title}</h3>
                  <div className="text-sm text-fixly-text-muted space-y-1">
                    <p>Budget: {job.budget.type === 'negotiable' ? 'Negotiable' : `₹${job.budget.amount?.toLocaleString()}`}</p>
                    <p>Location: {job.location.city}, {job.location.state}</p>
                    <p>Deadline: {getTimeRemaining(job.deadline)}</p>
                    {job.budget.type === 'negotiable' && (
                      <p className="text-fixly-accent font-medium">This job requires price negotiation</p>
                    )}
                  </div>
                </div>

                {/* Application Details */}
                <div className="space-y-2">
                  <h4 className="font-medium text-fixly-text">You're applying with:</h4>
                  <div className="text-sm text-fixly-text-muted space-y-1">
                    <p>Proposed Amount: ₹{(job.budget.type === 'negotiable' ? 1000 : job.budget.amount || 1000).toLocaleString()}</p>
                    <p>Cover Letter: "I am interested in this job and would like to discuss the details."</p>
                  </div>
                </div>

                {/* Credit Usage Warning */}
                {user?.plan?.type !== 'pro' && (
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                    <div className="flex items-center text-orange-800">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        This will use 1 of your {3 - (user?.plan?.creditsUsed || 0)} remaining free applications.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setShowApplicationModal(true);
                  }}
                  className="btn-ghost flex-1"
                >
                  Customize
                </button>
                <button
                  onClick={confirmApplication}
                  disabled={applying}
                  className="btn-primary flex-1"
                >
                  {applying ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Applying...
                    </>
                  ) : (
                    'Confirm Apply'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Application Modal */}
      <AnimatePresence>
        {showApplicationModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-fixly-card border border-fixly-border rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-fixly-text">
                  Apply for Job
                </h2>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="text-fixly-text-muted hover:text-fixly-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Job Summary */}
                <div className="bg-gradient-to-r from-fixly-accent-bg to-fixly-primary-bg border border-fixly-accent/20 p-5 rounded-xl">
                  <h3 className="font-semibold text-fixly-text mb-3 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-fixly-accent" />
                    {job.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center text-fixly-text-muted">
                      <DollarSign className="w-4 h-4 mr-2 text-fixly-accent" />
                      <span className="font-medium">Budget:</span>
                      <span className="ml-1">{job.budget.type === 'negotiable' ? 'Negotiable' : `₹${job.budget.amount?.toLocaleString()}`}</span>
                    </div>
                    <div className="flex items-center text-fixly-text-muted">
                      <MapPin className="w-4 h-4 mr-2 text-fixly-accent" />
                      <span className="font-medium">Location:</span>
                      <span className="ml-1">{job.location.city}, {job.location.state}</span>
                    </div>
                    <div className="flex items-center text-fixly-text-muted">
                      <Calendar className="w-4 h-4 mr-2 text-fixly-accent" />
                      <span className="font-medium">Deadline:</span>
                      <span className="ml-1">{new Date(job.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Proposed Amount */}
                <div className="bg-fixly-bg-secondary/20 border border-fixly-border/50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-fixly-text mb-3 flex items-center flex-wrap">
                    <DollarSign className="w-4 h-4 mr-2 text-fixly-accent" />
                    💰 Your Proposed Amount *
                    {job.budget.type === 'negotiable' && (
                      <span className="text-fixly-success text-xs ml-2 bg-fixly-success-bg px-2 py-1 rounded-full">
                        Negotiable - Propose your price
                      </span>
                    )}
                    {job.budget.type === 'fixed' && (
                      <span className="text-fixly-info text-xs ml-2 bg-fixly-info-bg px-2 py-1 rounded-full">
                        Fixed - Match or propose alternative
                      </span>
                    )}
                    {job.budget.type === 'hourly' && (
                      <span className="text-fixly-accent text-xs ml-2 bg-fixly-accent-bg px-2 py-1 rounded-full">
                        Hourly - Your rate per hour
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-fixly-accent font-semibold">₹</span>
                    <input
                      type="number"
                      value={applicationData.proposedAmount}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        proposedAmount: e.target.value
                      }))}
                      className="input-field pl-10 text-lg font-semibold text-fixly-accent"
                      placeholder={
                        job.budget.type === 'negotiable' ? "Enter your price" : 
                        job.budget.type === 'hourly' ? "Your hourly rate" :
                        job.budget.amount?.toString()
                      }
                      min="100"
                      max="1000000"
                      required
                    />
                  </div>
                  {job.budget.type === 'fixed' && job.budget.amount && (
                    <p className="text-xs text-fixly-text-muted mt-1">
                      Client's budget: ₹{job.budget.amount.toLocaleString()} 
                      {parseInt(applicationData.proposedAmount) !== job.budget.amount && applicationData.proposedAmount && (
                        <span className="text-fixly-warning ml-2 font-medium">
                          (Your proposal: ₹{parseInt(applicationData.proposedAmount).toLocaleString()})
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Budget Breakdown Option */}
                <div className="border border-fixly-border rounded-xl p-5 bg-fixly-bg-secondary/30">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-fixly-text mb-1">💰 Budget Breakdown</h4>
                      <p className="text-sm text-fixly-text-muted">Optional detailed cost breakdown for transparency</p>
                    </div>
                    <label className="flex items-center space-x-3 cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={applicationData.budgetBreakdown.enabled}
                        onChange={(e) => setApplicationData(prev => ({
                          ...prev,
                          budgetBreakdown: { ...prev.budgetBreakdown, enabled: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded border-fixly-border text-fixly-accent focus:border-fixly-accent focus:ring-fixly-accent"
                      />
                      <span className="text-sm font-medium text-fixly-text">Enable</span>
                    </label>
                  </div>
                  
                  {!applicationData.budgetBreakdown.enabled ? (
                    <div className="bg-fixly-accent-bg/50 border border-fixly-accent/20 rounded-lg p-4">
                      <p className="text-sm text-fixly-text-muted leading-relaxed">
                        💡 <strong>Pro tip:</strong> Breaking down your costs helps clients understand your pricing and builds trust. Include labor costs, materials, and any service fees.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-fixly-text mb-2">
                            Labor Cost
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted">₹</span>
                            <input
                              type="number"
                              value={applicationData.budgetBreakdown.laborCost}
                              onChange={(e) => {
                                const newBreakdown = { ...applicationData.budgetBreakdown, laborCost: e.target.value };
                                const total = (parseFloat(newBreakdown.laborCost) || 0) + 
                                            (parseFloat(newBreakdown.materialsCost) || 0) + 
                                            (parseFloat(newBreakdown.serviceFee) || 0);
                                setApplicationData(prev => ({
                                  ...prev,
                                  budgetBreakdown: newBreakdown,
                                  proposedAmount: total.toString()
                                }));
                              }}
                              className="input pl-8"
                              placeholder="Your work charges"
                            />
                          </div>
                        </div>
                        
                        {!job.budget.materialsIncluded && (
                          <div>
                            <label className="block text-sm font-medium text-fixly-text mb-2">
                              Materials Cost
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted">₹</span>
                              <input
                                type="number"
                                value={applicationData.budgetBreakdown.materialsCost}
                                onChange={(e) => {
                                  const newBreakdown = { ...applicationData.budgetBreakdown, materialsCost: e.target.value };
                                  const total = (parseFloat(newBreakdown.laborCost) || 0) + 
                                              (parseFloat(newBreakdown.materialsCost) || 0) + 
                                              (parseFloat(newBreakdown.serviceFee) || 0);
                                  setApplicationData(prev => ({
                                    ...prev,
                                    budgetBreakdown: newBreakdown,
                                    proposedAmount: total.toString()
                                  }));
                                }}
                                className="input pl-8"
                                placeholder="Material expenses"
                              />
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-fixly-text mb-2">
                            Service Fee
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted">₹</span>
                            <input
                              type="number"
                              value={applicationData.budgetBreakdown.serviceFee}
                              onChange={(e) => {
                                const newBreakdown = { ...applicationData.budgetBreakdown, serviceFee: e.target.value };
                                const total = (parseFloat(newBreakdown.laborCost) || 0) + 
                                            (parseFloat(newBreakdown.materialsCost) || 0) + 
                                            (parseFloat(newBreakdown.serviceFee) || 0);
                                setApplicationData(prev => ({
                                  ...prev,
                                  budgetBreakdown: newBreakdown,
                                  proposedAmount: total.toString()
                                }));
                              }}
                              className="input pl-8"
                              placeholder="Additional charges"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Auto-calculated total */}
                      <div className="bg-fixly-accent/10 border border-fixly-accent/20 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-fixly-accent">Calculated Total:</span>
                          <span className="text-lg font-semibold text-fixly-accent">
                            ₹{(
                              (parseFloat(applicationData.budgetBreakdown.laborCost) || 0) + 
                              (parseFloat(applicationData.budgetBreakdown.materialsCost) || 0) + 
                              (parseFloat(applicationData.budgetBreakdown.serviceFee) || 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-fixly-accent/70 mt-1">
                          This amount will be used as your proposed total above
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Materials Information */}
                <div className={`p-4 rounded-xl border-2 ${
                  job.budget.materialsIncluded 
                    ? 'border-fixly-success/30 bg-fixly-success-bg dark:bg-fixly-success/10' 
                    : 'border-fixly-warning/30 bg-fixly-warning-bg dark:bg-fixly-warning/10'
                }`}>
                  <div className="flex items-start">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                      job.budget.materialsIncluded ? 'bg-fixly-success' : 'bg-fixly-warning'
                    }`}>
                      {job.budget.materialsIncluded ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-sm mb-2 ${
                        job.budget.materialsIncluded ? 'text-fixly-success-text' : 'text-fixly-warning-text'
                      }`}>
                        {job.budget.materialsIncluded ? '✅ Materials Provided by Hirer' : '⚠️ Materials Not Provided'}
                      </h4>
                      <p className={`text-sm leading-relaxed ${
                        job.budget.materialsIncluded ? 'text-fixly-success-text/80' : 'text-fixly-warning-text/80'
                      }`}>
                        {job.budget.materialsIncluded 
                          ? 'Great news! The hirer will provide all required materials. Once your proposal is accepted, you can chat with them to coordinate material collection.'
                          : 'You\'ll need to arrange your own materials. Please include material costs in your budget breakdown above, and get materials before starting the job.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="bg-fixly-bg-secondary/20 border border-fixly-border/50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-fixly-text mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-fixly-accent" />
                    ⏱️ Time Estimate
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="number"
                      value={applicationData.timeEstimate.value}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        timeEstimate: { ...prev.timeEstimate, value: e.target.value }
                      }))}
                      className="input-field flex-1"
                      placeholder="Duration"
                      min="1"
                    />
                    <select
                      value={applicationData.timeEstimate.unit}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        timeEstimate: { ...prev.timeEstimate, unit: e.target.value }
                      }))}
                      className="input-field w-28"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>

                {/* Work Plan */}
                <div className="bg-fixly-bg-secondary/20 border border-fixly-border/50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-fixly-text mb-3 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-fixly-accent" />
                    🎯 Work Plan & Approach *
                    {job.budget.type === 'negotiable' && (
                      <span className="text-fixly-accent text-xs ml-2 bg-fixly-accent-bg px-2 py-1 rounded-full">
                        Detailed plan required
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={5}
                    value={applicationData.workPlan}
                    onChange={(e) => setApplicationData(prev => ({
                      ...prev,
                      workPlan: e.target.value
                    }))}
                    className="textarea-field"
                    placeholder={
                      job.budget.type === 'negotiable' 
                        ? "📝 Describe your detailed approach: How will you tackle this job? What's your step-by-step methodology? Include timeline, tools, and quality measures."
                        : "📋 Explain your approach: What steps will you take to complete this job successfully?"
                    }
                    maxLength={1500}
                    required
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-fixly-text-muted">
                      💡 Be specific - clients love detailed plans!
                    </p>
                    <p className="text-xs text-fixly-text-muted font-mono">
                      {applicationData.workPlan.length}/1500
                    </p>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="bg-fixly-bg-secondary/20 border border-fixly-border/50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-fixly-text mb-3 flex items-center">
                    <Star className="w-4 h-4 mr-2 text-fixly-accent" />
                    🌟 Why Choose You? *
                  </label>
                  <textarea
                    rows={4}
                    value={applicationData.coverLetter}
                    onChange={(e) => setApplicationData(prev => ({
                      ...prev,
                      coverLetter: e.target.value
                    }))}
                    className="textarea-field"
                    placeholder="🚀 What makes you the perfect choice? Highlight your relevant experience, skills, and what sets you apart from other fixers."
                    maxLength={800}
                    required
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-fixly-text-muted">
                      💪 Show your expertise and enthusiasm!
                    </p>
                    <p className="text-xs text-fixly-text-muted font-mono">
                      {applicationData.coverLetter.length}/800
                    </p>
                  </div>
                </div>

                {/* Requirements from Hirer */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    What You Need from the Client
                  </label>
                  <textarea
                    rows={3}
                    value={applicationData.requirements}
                    onChange={(e) => setApplicationData(prev => ({
                      ...prev,
                      requirements: e.target.value
                    }))}
                    className="input"
                    placeholder="List anything you need from the client: access, information, permissions, preparations, etc."
                    maxLength={500}
                  />
                  <p className="text-xs text-fixly-text-muted mt-1">
                    {applicationData.requirements.length}/500 characters
                  </p>
                </div>

                {/* Special Notes */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Special Notes & Conditions
                  </label>
                  <textarea
                    rows={2}
                    value={applicationData.specialNotes}
                    onChange={(e) => setApplicationData(prev => ({
                      ...prev,
                      specialNotes: e.target.value
                    }))}
                    className="input"
                    placeholder="Any special conditions, warranties, follow-up services, or important notes?"
                    maxLength={300}
                  />
                  <p className="text-xs text-fixly-text-muted mt-1">
                    {applicationData.specialNotes.length}/300 characters
                  </p>
                </div>

                {/* Materials List (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Materials Needed (Optional)
                  </label>
                  {applicationData.materialsList.map((material, index) => (
                    <div key={index} className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={material.item}
                        onChange={(e) => {
                          const newMaterials = [...applicationData.materialsList];
                          newMaterials[index].item = e.target.value;
                          setApplicationData(prev => ({ ...prev, materialsList: newMaterials }));
                        }}
                        className="input flex-1"
                        placeholder="Material/Tool name"
                      />
                      <input
                        type="number"
                        value={material.quantity}
                        onChange={(e) => {
                          const newMaterials = [...applicationData.materialsList];
                          newMaterials[index].quantity = parseInt(e.target.value) || 1;
                          setApplicationData(prev => ({ ...prev, materialsList: newMaterials }));
                        }}
                        className="input w-20"
                        placeholder="Qty"
                        min="1"
                      />
                      <input
                        type="number"
                        value={material.estimatedCost}
                        onChange={(e) => {
                          const newMaterials = [...applicationData.materialsList];
                          newMaterials[index].estimatedCost = parseFloat(e.target.value) || 0;
                          setApplicationData(prev => ({ ...prev, materialsList: newMaterials }));
                        }}
                        className="input w-24"
                        placeholder="Cost"
                        min="0"
                      />
                      <button
                        onClick={() => {
                          const newMaterials = applicationData.materialsList.filter((_, i) => i !== index);
                          setApplicationData(prev => ({ ...prev, materialsList: newMaterials }));
                        }}
                        className="btn-ghost text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setApplicationData(prev => ({
                        ...prev,
                        materialsList: [...prev.materialsList, { item: '', quantity: 1, estimatedCost: 0 }]
                      }));
                    }}
                    className="btn-ghost text-fixly-accent"
                  >
                    + Add Material
                  </button>
                </div>

                {/* Total Calculation */}
                <div className="bg-fixly-bg p-4 rounded-lg">
                  <h4 className="font-medium text-fixly-text mb-3">Proposal Summary</h4>
                  
                  <div className="space-y-2 text-sm">
                    {applicationData.budgetBreakdown.enabled ? (
                      // Show detailed breakdown
                      <>
                        {applicationData.budgetBreakdown.laborCost && (
                          <div className="flex justify-between">
                            <span>Labor Cost:</span>
                            <span className="font-medium">₹{parseFloat(applicationData.budgetBreakdown.laborCost).toLocaleString()}</span>
                          </div>
                        )}
                        
                        {applicationData.budgetBreakdown.materialsCost && !job.budget.materialsIncluded && (
                          <div className="flex justify-between">
                            <span>Materials Cost:</span>
                            <span className="font-medium">₹{parseFloat(applicationData.budgetBreakdown.materialsCost).toLocaleString()}</span>
                          </div>
                        )}
                        
                        {job.budget.materialsIncluded && (
                          <div className="flex justify-between text-green-600">
                            <span>Materials:</span>
                            <span>Provided by hirer</span>
                          </div>
                        )}
                        
                        {applicationData.budgetBreakdown.serviceFee && (
                          <div className="flex justify-between">
                            <span>Service Fee:</span>
                            <span className="font-medium">₹{parseFloat(applicationData.budgetBreakdown.serviceFee).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      // Show simple breakdown
                      <>
                        <div className="flex justify-between">
                          <span>Service Charge:</span>
                          <span className="font-medium">₹{parseInt(applicationData.proposedAmount || 0).toLocaleString()}</span>
                        </div>
                        
                        {job.budget.materialsIncluded && (
                          <div className="flex justify-between text-green-600">
                            <span>Materials:</span>
                            <span>Provided by hirer</span>
                          </div>
                        )}
                        
                        {applicationData.materialsList.length > 0 && !job.budget.materialsIncluded && (
                          <div className="flex justify-between">
                            <span>Additional Materials:</span>
                            <span>₹{applicationData.materialsList.reduce((total, material) => total + (material.estimatedCost || 0), 0).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <hr className="my-2" />
                    
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total Estimate:</span>
                      <span className="text-fixly-accent">
                        ₹{parseInt(applicationData.proposedAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="text-xs text-fixly-text-muted mt-2">
                      <p>• Price includes: {job.budget.materialsIncluded ? 'Service (materials provided by hirer)' : (applicationData.budgetBreakdown.enabled && applicationData.budgetBreakdown.materialsCost ? 'Service + Materials' : 'Service only')}</p>
                      {applicationData.timeEstimate.value && (
                        <p>• Estimated time: {applicationData.timeEstimate.value} {applicationData.timeEstimate.unit}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDetailedApplication}
                  disabled={applying || !applicationData.proposedAmount || !applicationData.coverLetter || !applicationData.workPlan}
                  className="btn-primary flex-1"
                >
                  {applying ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-fixly-text">
                  Rate {user?.role === 'hirer' ? 'Fixer' : 'Client'}
                </h2>
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="text-fixly-text-muted hover:text-fixly-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Overall Rating */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Overall Rating *
                  </label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingData(prev => ({ ...prev, rating: star }))}
                        className={`text-2xl ${
                          star <= ratingData.rating ? 'text-yellow-500' : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-fixly-text-muted mt-1">
                    {ratingData.rating === 0 && 'Select a rating'}
                    {ratingData.rating === 1 && 'Poor'}
                    {ratingData.rating === 2 && 'Fair'}
                    {ratingData.rating === 3 && 'Good'}
                    {ratingData.rating === 4 && 'Very Good'}
                    {ratingData.rating === 5 && 'Excellent'}
                  </p>
                </div>

                {/* Category Ratings */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-3">
                    Detailed Ratings
                  </label>
                  
                  {Object.entries({
                    communication: 'Communication',
                    quality: user?.role === 'hirer' ? 'Work Quality' : 'Clarity of Requirements',
                    timeliness: 'Timeliness',
                    professionalism: 'Professionalism'
                  }).map(([key, label]) => (
                    <div key={key} className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-fixly-text">{label}</span>
                        <span className="text-xs text-fixly-text-muted">
                          {ratingData.categories[key] || 0}/5
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRatingData(prev => ({
                              ...prev,
                              categories: { ...prev.categories, [key]: star }
                            }))}
                            className={`text-lg ${
                              star <= ratingData.categories[key] ? 'text-yellow-500' : 'text-gray-300'
                            } hover:text-yellow-400 transition-colors`}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Written Review */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Written Review (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={ratingData.review}
                    onChange={(e) => setRatingData(prev => ({ ...prev, review: e.target.value }))}
                    className="input"
                    placeholder={`Share your experience with this ${user?.role === 'hirer' ? 'fixer' : 'client'}...`}
                    maxLength={500}
                  />
                  <p className="text-xs text-fixly-text-muted mt-1">
                    {ratingData.review.length}/500 characters
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="btn-secondary flex-1"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={ratingData.rating === 0}
                  className="btn-primary flex-1"
                >
                  Submit Rating
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Comment Button */}
      <button
        onClick={() => setShowInstagramComments(true)}
        className="fixed bottom-6 right-6 bg-fixly-accent hover:bg-fixly-accent-dark text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 z-40"
        title="Open Comments"
      >
        <MessageSquare className="h-6 w-6" />
        {comments.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {comments.length > 99 ? '99+' : comments.length}
          </span>
        )}
      </button>

      {/* Instagram-Style Comments Modal */}
      <InstagramCommentsRealtime
        jobId={jobId}
        isOpen={showInstagramComments}
        onClose={() => setShowInstagramComments(false)}
        initialCommentCount={comments.length}
      />

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {showImageModal && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.name || 'Job attachment'}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              
              {/* Close button */}
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Image info */}
              {selectedImage.name && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
                  <p className="font-medium">{selectedImage.name}</p>
                  <p className="text-sm text-gray-300">
                    {(selectedImage.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
