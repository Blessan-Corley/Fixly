'use client';

import { Loader, Send } from 'lucide-react';

import type { ReviewFormData } from './review.types';

type ReviewRecommendationsSectionProps = {
  reviewData: ReviewFormData;
  isClient: boolean;
  revieweeName: string;
  isSubmitting: boolean;
  setReviewData: (updater: (previous: ReviewFormData) => ReviewFormData) => void;
};

export default function ReviewRecommendationsSection({
  reviewData,
  isClient,
  revieweeName,
  isSubmitting,
  setReviewData,
}: ReviewRecommendationsSectionProps) {
  return (
    <>
      <div className="card">
        <h3 className="mb-6 text-lg font-semibold text-fixly-text">Recommendations</h3>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={reviewData.wouldRecommend}
              onChange={(e) =>
                setReviewData((prev) => ({ ...prev, wouldRecommend: e.target.checked }))
              }
              className="h-4 w-4 text-fixly-accent"
            />
            <span className="text-sm text-fixly-text">
              I would recommend {revieweeName} to others
            </span>
          </label>

          {isClient && (
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={reviewData.wouldHireAgain}
                onChange={(e) =>
                  setReviewData((prev) => ({ ...prev, wouldHireAgain: e.target.checked }))
                }
                className="h-4 w-4 text-fixly-accent"
              />
              <span className="text-sm text-fixly-text">
                I would hire {revieweeName} again
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !reviewData.rating.overall}
          className="btn-primary flex items-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Send className="mr-2 h-5 w-5" />
          )}
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </>
  );
}
