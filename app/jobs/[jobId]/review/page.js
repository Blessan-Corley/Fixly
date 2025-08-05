'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Star,
  StarHalf,
  ArrowLeft,
  Send,
  Plus,
  Minus,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  AlertCircle,
  Loader,
  Camera,
  FileText,
  User,
  MapPin,
  DollarSign,
  Calendar,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewJobPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: {
      overall: 0,
      workQuality: 0,
      communication: 0,
      punctuality: 0,
      professionalism: 0,
      clarity: 0,
      responsiveness: 0,
      paymentTimeliness: 0
    },
    title: '',
    comment: '',
    pros: [''],
    cons: [''],
    tags: [],
    wouldRecommend: true,
    wouldHireAgain: true
  });

  // Predefined tags for different review types
  const positiveTagsForFixer = [
    'excellent_work', 'on_time', 'great_communication', 'professional',
    'exceeded_expectations', 'fair_price', 'clean_work', 'polite',
    'experienced', 'reliable', 'creative', 'efficient'
  ];

  const negativeTagsForFixer = [
    'poor_quality', 'late', 'unprofessional', 'overpriced',
    'miscommunication', 'incomplete', 'rude', 'inexperienced'
  ];

  const positiveTagsForClient = [
    'clear_requirements', 'responsive', 'fair_payment', 'professional',
    'understanding', 'flexible', 'prompt_payment', 'good_communication'
  ];

  const negativeTagsForClient = [
    'unclear_requirements', 'unresponsive', 'payment_issues', 'unrealistic_expectations',
    'poor_communication', 'changed_requirements', 'delayed_payment', 'rude'
  ];

  useEffect(() => {
    if (session && jobId) {
      fetchJobDetails();
    }
  }, [session, jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (data.success) {
        setJob(data.job);
        
        // Check if job is completed and user can review
        if (data.job.status !== 'completed') {
          toast.error('Can only review completed jobs');
          router.push(`/jobs/${jobId}`);
          return;
        }

        // Check user's role in the job
        const isClient = data.job.client._id === session.user.id;
        const isFixer = data.job.fixer && data.job.fixer._id === session.user.id;

        if (!isClient && !isFixer) {
          toast.error('You can only review jobs you were involved in');
          router.push(`/jobs/${jobId}`);
          return;
        }
      } else {
        toast.error(data.message || 'Failed to fetch job details');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to fetch job details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateRating = (category, value) => {
    setReviewData(prev => ({
      ...prev,
      rating: {
        ...prev.rating,
        [category]: value
      }
    }));
  };

  const addProsOrCons = (type) => {
    setReviewData(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };

  const removeProsOrCons = (type, index) => {
    setReviewData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateProsOrCons = (type, index, value) => {
    setReviewData(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => i === index ? value : item)
    }));
  };

  const toggleTag = (tag) => {
    setReviewData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reviewData.rating.overall) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (!reviewData.title.trim() || !reviewData.comment.trim()) {
      toast.error('Please provide a title and comment');
      return;
    }

    setSubmitting(true);

    try {
      const isClient = job.client._id === session.user.id;
      const reviewType = isClient ? 'client_to_fixer' : 'fixer_to_client';
      const revieweeId = isClient ? job.fixer._id : job.client._id;

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          revieweeId,
          reviewType,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          pros: reviewData.pros.filter(p => p.trim()),
          cons: reviewData.cons.filter(c => c.trim()),
          tags: reviewData.tags,
          wouldRecommend: reviewData.wouldRecommend,
          wouldHireAgain: reviewData.wouldHireAgain
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Review submitted successfully!');
        router.push(`/jobs/${jobId}`);
      } else {
        toast.error(data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fixly-text">{label}</label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${
              star <= value ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-fixly-text-light">
          {value > 0 ? `${value}/5` : 'No rating'}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-fixly-text">Job not found</h1>
        </div>
      </div>
    );
  }

  const isClient = job.client._id === session.user.id;
  const reviewee = isClient ? job.fixer : job.client;

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-fixly-text-light hover:text-fixly-accent mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Job
          </button>
          
          <h1 className="text-3xl font-bold text-fixly-text mb-2">
            Write a Review
          </h1>
          <p className="text-fixly-text-light">
            Share your experience working {isClient ? 'with' : 'for'} {reviewee.name}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Job Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-fixly-text">{job.title}</h4>
                  <p className="text-sm text-fixly-text-light capitalize">{job.category}</p>
                </div>

                <div className="flex items-center text-sm text-fixly-text-light">
                  <MapPin className="h-4 w-4 mr-2" />
                  {job.location.address}
                </div>

                <div className="flex items-center text-sm text-fixly-text-light">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ₹{job.budget.amount.toLocaleString()}
                </div>

                <div className="flex items-center text-sm text-fixly-text-light">
                  <Calendar className="h-4 w-4 mr-2" />
                  Completed {new Date(job.completedAt).toLocaleDateString()}
                </div>

                {/* Reviewee Info */}
                <div className="pt-4 border-t border-fixly-border">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-fixly-accent-light rounded-full flex items-center justify-center">
                      {reviewee.photoURL ? (
                        <img
                          src={reviewee.photoURL}
                          alt={reviewee.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-fixly-accent" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-fixly-text">{reviewee.name}</h4>
                      <p className="text-sm text-fixly-text-light">@{reviewee.username}</p>
                      {reviewee.rating?.average > 0 && (
                        <div className="flex items-center mt-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                          <span className="text-sm text-fixly-text-light">
                            {reviewee.rating.average} ({reviewee.rating.count} reviews)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Review Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Overall Rating */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Overall Rating</h3>
                <StarRating
                  value={reviewData.rating.overall}
                  onChange={(value) => updateRating('overall', value)}
                  label="How would you rate your overall experience?"
                />
              </div>

              {/* Detailed Ratings */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Detailed Ratings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isClient ? (
                    <>
                      <StarRating
                        value={reviewData.rating.workQuality}
                        onChange={(value) => updateRating('workQuality', value)}
                        label="Work Quality"
                      />
                      <StarRating
                        value={reviewData.rating.communication}
                        onChange={(value) => updateRating('communication', value)}
                        label="Communication"
                      />
                      <StarRating
                        value={reviewData.rating.punctuality}
                        onChange={(value) => updateRating('punctuality', value)}
                        label="Punctuality"
                      />
                      <StarRating
                        value={reviewData.rating.professionalism}
                        onChange={(value) => updateRating('professionalism', value)}
                        label="Professionalism"
                      />
                    </>
                  ) : (
                    <>
                      <StarRating
                        value={reviewData.rating.clarity}
                        onChange={(value) => updateRating('clarity', value)}
                        label="Requirements Clarity"
                      />
                      <StarRating
                        value={reviewData.rating.responsiveness}
                        onChange={(value) => updateRating('responsiveness', value)}
                        label="Responsiveness"
                      />
                      <StarRating
                        value={reviewData.rating.paymentTimeliness}
                        onChange={(value) => updateRating('paymentTimeliness', value)}
                        label="Payment Timeliness"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Review Details */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Review Details</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Review Title *
                    </label>
                    <input
                      type="text"
                      value={reviewData.title}
                      onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Summarize your experience in a few words"
                      className="input-field"
                      maxLength={100}
                      required
                    />
                    <p className="text-xs text-fixly-text-light mt-1">
                      {reviewData.title.length}/100 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Detailed Review *
                    </label>
                    <textarea
                      value={reviewData.comment}
                      onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Share the details of your experience. What went well? What could be improved?"
                      className="input-field"
                      rows={5}
                      maxLength={1000}
                      required
                    />
                    <p className="text-xs text-fixly-text-light mt-1">
                      {reviewData.comment.length}/1000 characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Pros and Cons */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Pros & Cons</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pros */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-fixly-text">
                        What went well?
                      </label>
                      <button
                        type="button"
                        onClick={() => addProsOrCons('pros')}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {reviewData.pros.map((pro, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <ThumbsUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <input
                            type="text"
                            value={pro}
                            onChange={(e) => updateProsOrCons('pros', index, e.target.value)}
                            placeholder="Something positive..."
                            className="input-field flex-1"
                            maxLength={200}
                          />
                          {reviewData.pros.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProsOrCons('pros', index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cons */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-fixly-text">
                        What could be improved?
                      </label>
                      <button
                        type="button"
                        onClick={() => addProsOrCons('cons')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {reviewData.cons.map((con, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <ThumbsDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <input
                            type="text"
                            value={con}
                            onChange={(e) => updateProsOrCons('cons', index, e.target.value)}
                            placeholder="Something that could be better..."
                            className="input-field flex-1"
                            maxLength={200}
                          />
                          {reviewData.cons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProsOrCons('cons', index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Tags</h3>
                <p className="text-sm text-fixly-text-light mb-4">
                  Select tags that describe your experience
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2">Positive</h4>
                    <div className="flex flex-wrap gap-2">
                      {(isClient ? positiveTagsForFixer : positiveTagsForClient).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            reviewData.tags.includes(tag)
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-green-50'
                          }`}
                        >
                          {tag.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">Areas for Improvement</h4>
                    <div className="flex flex-wrap gap-2">
                      {(isClient ? negativeTagsForFixer : negativeTagsForClient).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            reviewData.tags.includes(tag)
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-red-50'
                          }`}
                        >
                          {tag.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Recommendations</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={reviewData.wouldRecommend}
                        onChange={(e) => setReviewData(prev => ({ ...prev, wouldRecommend: e.target.checked }))}
                        className="h-4 w-4 text-fixly-accent"
                      />
                      <span className="text-sm text-fixly-text">
                        I would recommend {reviewee.name} to others
                      </span>
                    </label>
                  </div>

                  {isClient && (
                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={reviewData.wouldHireAgain}
                          onChange={(e) => setReviewData(prev => ({ ...prev, wouldHireAgain: e.target.checked }))}
                          className="h-4 w-4 text-fixly-accent"
                        />
                        <span className="text-sm text-fixly-text">
                          I would hire {reviewee.name} again
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !reviewData.rating.overall}
                  className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Send className="h-5 w-5 mr-2" />
                  )}
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}