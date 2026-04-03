'use client';

import type { ReviewFormData } from './review.types';

type ReviewDetailsSectionProps = {
  reviewData: ReviewFormData;
  setReviewData: (updater: (previous: ReviewFormData) => ReviewFormData) => void;
};

export default function ReviewDetailsSection({
  reviewData,
  setReviewData,
}: ReviewDetailsSectionProps) {
  return (
    <div className="card">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Review Details</h3>
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Review Title *
          </label>
          <input
            type="text"
            value={reviewData.title}
            onChange={(e) =>
              setReviewData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Summarize your experience in a few words"
            className="input-field"
            maxLength={100}
            required
          />
          <p className="mt-1 text-xs text-fixly-text-light">
            {reviewData.title.length}/100 characters
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Detailed Review *
          </label>
          <textarea
            value={reviewData.comment}
            onChange={(e) =>
              setReviewData((prev) => ({ ...prev, comment: e.target.value }))
            }
            placeholder="Share the details of your experience. What went well? What could be improved?"
            className="input-field"
            rows={5}
            maxLength={1000}
            required
          />
          <p className="mt-1 text-xs text-fixly-text-light">
            {reviewData.comment.length}/1000 characters
          </p>
        </div>
      </div>
    </div>
  );
}
