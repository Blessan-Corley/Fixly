'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign,
  User,
  Star,
  Phone,
  Mail,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle,
  Loader,
  Eye,
  Heart,
  Share2,
  Flag,
  MessageCircle,
  Users,
  Badge,
  Shield,
  Target,
  Timer,
  BookOpen,
  ThumbsUp,
  MessageSquare,
  Award,
  Edit,
  Reply,
  Scale
} from 'lucide-react';
import { toast } from 'sonner';
import JobCommentButton from '../../../components/JobCommentButton';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const jobId = params.jobId;

  // State management
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [applicationData, setApplicationData] = useState({
    proposedAmount: '',
    message: '',
    estimatedTime: ''
  });

  // Fetch job details
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${jobId}`);
        
        if (!response.ok) {
          throw new Error('Job not found');
        }
        
        const data = await response.json();
        setJob(data.job);
        
        // Check if user has already applied
        if (session?.user?.id && data.job.applications) {
          const userApplication = data.job.applications.find(
            app => app.fixer === session.user.id
          );
          setHasApplied(!!userApplication);
        }
        
        // Track job view
        if (session?.user?.id) {
          fetch(`/api/jobs/${jobId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('Error fetching job:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId, session]);

  // Fetch reviews for this job
  useEffect(() => {
    const fetchJobReviews = async () => {
      try {
        setLoadingReviews(true);
        const response = await fetch(`/api/reviews?jobId=${jobId}`);
        const data = await response.json();
        
        if (data.success) {
          setReviews(data.reviews);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (jobId && job?.status === 'completed') {
      fetchJobReviews();
    }
  }, [jobId, job?.status]);

  const handleApplyToJob = async () => {
    if (!session) {
      toast.error('Please sign in to apply for jobs');
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'fixer') {
      toast.error('Only fixers can apply to jobs');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposedAmount: parseFloat(applicationData.proposedAmount),
          message: applicationData.message,
          estimatedTime: applicationData.estimatedTime
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Application submitted successfully!');
        setHasApplied(true);
        setShowApplicationForm(false);
        setApplicationData({ proposedAmount: '', message: '', estimatedTime: '' });
      } else {
        toast.error(result.message || 'Failed to apply to job');
      }
    } catch (error) {
      console.error('Error applying to job:', error);
      toast.error('Error applying to job. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fixly-bg flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-fixly-accent mx-auto mb-4" />
          <p className="text-fixly-text-light">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-fixly-bg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-fixly-text mb-2">Job Not Found</h1>
          <p className="text-fixly-text-light mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="btn-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Navigation */}
      <div className="bg-fixly-card border-b border-fixly-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-fixly-text-light hover:text-fixly-text"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ').charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(job.urgency)}`}>
                    {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)} Priority
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-fixly-text-light hover:text-fixly-accent hover:bg-fixly-bg rounded-lg">
                    <Heart className="h-5 w-5" />
                  </button>
                  <JobCommentButton 
                    jobId={jobId} 
                    commentCount={job.comments?.length || 0}
                    className="p-2 text-fixly-text-light hover:text-fixly-accent hover:bg-fixly-bg rounded-lg"
                    showText={false}
                  />
                  <button className="p-2 text-fixly-text-light hover:text-fixly-accent hover:bg-fixly-bg rounded-lg">
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-fixly-text-light hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Flag className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-fixly-text mb-4">{job.title}</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center text-fixly-text-light">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">{job.location?.city || 'Location not specified'}</span>
                </div>
                <div className="flex items-center text-fixly-text-light">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">{formatDate(job.createdAt)}</span>
                </div>
                <div className="flex items-center text-fixly-text-light">
                  <Eye className="h-4 w-4 mr-2" />
                  <span className="text-sm">{job.views || 0} views</span>
                </div>
                <div className="flex items-center text-fixly-text-light">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="text-sm">{job.applications?.length || 0} applications</span>
                </div>
                <div className="flex items-center text-fixly-text-light">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{job.comments?.length || 0} comments</span>
                </div>
              </div>

              {/* Skills Required */}
              {job.skillsRequired && job.skillsRequired.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-fixly-text mb-3">Skills Required</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skillsRequired.map((skill, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-fixly-accent-light text-fixly-accent text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Job Description */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h2 className="text-xl font-bold text-fixly-text mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Job Description
              </h2>
              <div className="prose max-w-none text-fixly-text-light">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
            </motion.div>

            {/* Budget & Timeline */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h2 className="text-xl font-bold text-fixly-text mb-4">Budget & Timeline</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-50 rounded-lg mr-4">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-fixly-text-light">Budget</p>
                    <p className="text-lg font-semibold text-fixly-text">
                      {job.budget?.type === 'fixed' 
                        ? formatCurrency(job.budget.amount)
                        : job.budget?.type === 'range' 
                        ? `${formatCurrency(job.budget.min)} - ${formatCurrency(job.budget.max)}`
                        : 'Negotiable'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="p-3 bg-blue-50 rounded-lg mr-4">
                    <Timer className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-fixly-text-light">Expected Duration</p>
                    <p className="text-lg font-semibold text-fixly-text">
                      {job.timeline?.expected || 'To be discussed'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Application Form */}
            {showApplicationForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="card"
              >
                <h2 className="text-xl font-bold text-fixly-text mb-4">Apply for this Job</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Your Proposed Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={applicationData.proposedAmount}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, proposedAmount: e.target.value }))}
                      placeholder="Enter your proposed amount"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Estimated Completion Time
                    </label>
                    <input
                      type="text"
                      value={applicationData.estimatedTime}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                      placeholder="e.g., 3-5 days, 1 week"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Cover Message
                    </label>
                    <textarea
                      value={applicationData.message}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell the client why you're the right person for this job..."
                      rows={4}
                      className="textarea-field"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleApplyToJob}
                      disabled={applying || !applicationData.proposedAmount || !applicationData.message}
                      className="btn-primary flex-1"
                    >
                      {applying ? (
                        <Loader className="animate-spin h-4 w-4 mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit Application
                    </button>
                    <button
                      onClick={() => setShowApplicationForm(false)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reviews Section */}
            {job?.status === 'completed' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-fixly-text flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Reviews ({reviews.length})
                  </h2>
                  
                  {/* Review Action Button */}
                  {session && (
                    (job.client._id === session.user.id || 
                     (job.fixer && job.fixer._id === session.user.id)) && (
                    <div className="flex space-x-2">
                      {!reviews.find(r => r.reviewer._id === session.user.id) && (
                        <button
                          onClick={() => router.push(`/jobs/${jobId}/review`)}
                          className="btn-secondary flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Write Review
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/jobs/${jobId}/reviews`)}
                        className="btn-ghost flex items-center"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View All
                      </button>
                    </div>
                  ))}
                </div>

                {loadingReviews ? (
                  <div className="text-center py-8">
                    <Loader className="h-8 w-8 animate-spin text-fixly-accent mx-auto" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-fixly-text mb-2">
                      No reviews yet
                    </h3>
                    <p className="text-fixly-text-light">
                      Reviews will appear here once this job is completed and reviewed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 2).map((review) => (
                      <div key={review._id} className="border border-fixly-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-fixly-accent-light rounded-full flex items-center justify-center">
                              {review.reviewer.photoURL ? (
                                <img
                                  src={review.reviewer.photoURL}
                                  alt={review.reviewer.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-fixly-accent" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-fixly-text">{review.reviewer.name}</h4>
                              <p className="text-sm text-fixly-text-light">
                                {review.reviewType === 'client_to_fixer' ? 'Client' : 'Service Provider'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(review.rating.overall)
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm font-medium text-fixly-text">
                              {review.rating.overall}/5
                            </span>
                          </div>
                        </div>
                        
                        <h5 className="font-medium text-fixly-text mb-2">{review.title}</h5>
                        <p className="text-fixly-text-light text-sm line-clamp-3 mb-3">
                          {review.comment}
                        </p>
                        
                        {review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {review.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                              >
                                {tag.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {review.tags.length > 3 && (
                              <span className="text-xs text-fixly-text-light">
                                +{review.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-fixly-text-light">
                          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              <span>Helpful ({review.helpfulVotes?.count || 0})</span>
                            </div>
                            {review.wouldRecommend && (
                              <div className="flex items-center text-green-600">
                                <Award className="h-3 w-3 mr-1" />
                                <span>Recommended</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {review.response && review.response.comment && (
                          <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                            <div className="flex items-center mb-1">
                              <Reply className="h-3 w-3 text-blue-600 mr-1" />
                              <span className="text-sm font-medium text-blue-800">Response</span>
                            </div>
                            <p className="text-sm text-blue-700">{review.response.comment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {reviews.length > 2 && (
                      <div className="text-center">
                        <button
                          onClick={() => router.push(`/jobs/${jobId}/reviews`)}
                          className="btn-ghost text-sm"
                        >
                          View all {reviews.length} reviews
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <h3 className="text-lg font-bold text-fixly-text mb-4">Client Information</h3>
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-fixly-accent-light rounded-full flex items-center justify-center mr-3">
                  <User className="h-6 w-6 text-fixly-accent" />
                </div>
                <div>
                  <p className="font-semibold text-fixly-text">{job.createdBy?.name || 'Anonymous'}</p>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm text-fixly-text-light">
                      {job.createdBy?.rating?.average?.toFixed(1) || 'No rating'} 
                      ({job.createdBy?.rating?.count || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-fixly-text-light">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  <span>Verified Client</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  <span>Member since {formatDate(job.createdBy?.createdAt)}</span>
                </div>
              </div>
              
              {session?.user?.role === 'fixer' && (
                <div className="pt-4 border-t border-fixly-border mt-4">
                  <button 
                    onClick={() => router.push(`/dashboard/messages?user=${job.createdBy?._id}`)}
                    className="btn-ghost w-full"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Client
                  </button>
                </div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="card"
            >
              {!session ? (
                <div className="text-center">
                  <p className="text-fixly-text-light mb-4">Sign in to apply for this job</p>
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="btn-primary w-full"
                  >
                    Sign In to Apply
                  </button>
                </div>
              ) : session.user.role !== 'fixer' ? (
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-fixly-text-light">Only fixers can apply to jobs</p>
                </div>
              ) : hasApplied ? (
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-fixly-text-light mb-4">You have already applied to this job</p>
                  <button
                    onClick={() => router.push('/dashboard/applications')}
                    className="btn-ghost w-full"
                  >
                    View My Applications
                  </button>
                </div>
              ) : job.status !== 'open' ? (
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-fixly-text-light">This job is no longer accepting applications</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="btn-primary w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Apply Now
                </button>
              )}
            </motion.div>

            {/* Dispute Resolution */}
            {session && (job.client._id === session.user.id || (job.fixer && job.fixer._id === session.user.id)) && 
             ['in_progress', 'completed', 'disputed'].includes(job.status) && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="card"
              >
                <h3 className="text-lg font-bold text-fixly-text mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <p className="text-sm text-fixly-text-light">
                    Having issues with this job? Our dispute resolution system can help.
                  </p>
                  <button
                    onClick={() => router.push(`/jobs/${job._id}/dispute`)}
                    className="btn-ghost w-full flex items-center justify-center"
                  >
                    <Scale className="h-4 w-4 mr-2" />
                    File a Dispute
                  </button>
                </div>
              </motion.div>
            )}

            {/* Job Stats */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="card"
            >
              <h3 className="text-lg font-bold text-fixly-text mb-4">Job Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-fixly-text-light">Posted</span>
                  <span className="text-fixly-text">{formatDate(job.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-light">Applications</span>
                  <span className="text-fixly-text">{job.applications?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-light">Views</span>
                  <span className="text-fixly-text">{job.views || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-light">Comments</span>
                  <span className="text-fixly-text">{job.comments?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-light">Job ID</span>
                  <span className="text-fixly-text font-mono text-xs">{job._id?.slice(-8)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}