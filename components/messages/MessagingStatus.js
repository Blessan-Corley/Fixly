'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Star,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Award
} from 'lucide-react';
import ReviewForm from '../reviews/ReviewForm';

export default function MessagingStatus({
  job,
  reviewStatus,
  messagingAllowed,
  messagingClosedAt,
  userRole,
  onReviewSubmit
}) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleReviewSubmit = async (reviewData) => {
    setIsSubmittingReview(true);
    try {
      await onReviewSubmit(reviewData);
      setShowReviewForm(false);
    } catch (error) {
      throw error;
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // If messaging is still allowed, show minimal status
  if (messagingAllowed) {
    return (
      <>
        {job.status === 'completed' && reviewStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Job Completed!</h3>
                  <p className="text-sm text-green-600">
                    {reviewStatus.canReview
                      ? `Please share your experience by leaving a review`
                      : reviewStatus.hasReviewed
                      ? `You've submitted your review. ${reviewStatus.otherPartyReviewed ? 'Both reviews complete!' : 'Waiting for the other party to review.'}`
                      : 'Reviews are in progress'
                    }
                  </p>
                </div>
              </div>

              {reviewStatus.canReview && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-gradient-to-r from-fixly-primary to-fixly-secondary text-white px-4 py-2 rounded-lg hover:from-fixly-primary-dark hover:to-fixly-secondary-dark transition-all flex items-center space-x-2"
                >
                  <Star className="w-4 h-4" />
                  <span>Leave Review</span>
                </button>
              )}
            </div>

            {/* Review progress indicator */}
            <div className="mt-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${reviewStatus.hasReviewed ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">Your review</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${reviewStatus.otherPartyReviewed ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">Their review</span>
              </div>
            </div>
          </motion.div>
        )}

        <ReviewForm
          job={job}
          isOpen={showReviewForm}
          onClose={() => setShowReviewForm(false)}
          onSubmit={handleReviewSubmit}
          userRole={userRole}
          isLoading={isSubmittingReview}
        />
      </>
    );
  }

  // If messaging is closed, show closure status
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-6 text-center"
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Lock icon */}
        <div className="bg-gray-100 p-4 rounded-full">
          <Lock className="w-8 h-8 text-gray-600" />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Conversation Closed
          </h3>
          <p className="text-gray-600 max-w-md">
            This conversation has been automatically closed as both parties have completed their reviews.
          </p>
        </div>

        {/* Review completion status */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 w-full max-w-md">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <Award className="w-6 h-6 text-yellow-500" />
            <span className="font-semibold text-gray-800">Reviews Complete</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your review:</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Submitted</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Their review:</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Submitted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Closure timestamp */}
        {messagingClosedAt && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>
              Closed on {new Date(messagingClosedAt).toLocaleDateString()} at{' '}
              {new Date(messagingClosedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}

        {/* Thank you message */}
        <div className="bg-gradient-to-r from-fixly-accent/10 to-fixly-secondary/10 border border-fixly-accent/30 rounded-lg p-4 w-full">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-fixly-primary" />
            <span className="font-semibold text-fixly-primary">Thank You!</span>
          </div>
          <p className="text-sm text-fixly-primary text-center">
            Thank you for using Fixly! Your reviews help build trust in our community.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => window.location.href = '/jobs/browse'}
            className="flex-1 bg-gradient-to-r from-fixly-primary to-fixly-secondary text-white px-4 py-2 rounded-lg hover:from-fixly-primary-dark hover:to-fixly-secondary-dark transition-all"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    </motion.div>
  );
}