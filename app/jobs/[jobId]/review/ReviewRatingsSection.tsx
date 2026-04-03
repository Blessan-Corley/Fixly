'use client';

import type { RatingCategory, ReviewFormData } from './review.types';
import StarRating from './StarRating';

type ReviewRatingsSectionProps = {
  reviewData: ReviewFormData;
  isClient: boolean;
  onUpdateRating: (category: RatingCategory, value: number) => void;
};

export default function ReviewRatingsSection({
  reviewData,
  isClient,
  onUpdateRating,
}: ReviewRatingsSectionProps) {
  return (
    <>
      <div className="card">
        <h3 className="mb-6 text-lg font-semibold text-fixly-text">Overall Rating</h3>
        <StarRating
          value={reviewData.rating.overall}
          onChange={(value) => onUpdateRating('overall', value)}
          label="How would you rate your overall experience?"
        />
      </div>

      <div className="card">
        <h3 className="mb-6 text-lg font-semibold text-fixly-text">Detailed Ratings</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {isClient ? (
            <>
              <StarRating
                value={reviewData.rating.workQuality}
                onChange={(value) => onUpdateRating('workQuality', value)}
                label="Work Quality"
              />
              <StarRating
                value={reviewData.rating.communication}
                onChange={(value) => onUpdateRating('communication', value)}
                label="Communication"
              />
              <StarRating
                value={reviewData.rating.punctuality}
                onChange={(value) => onUpdateRating('punctuality', value)}
                label="Punctuality"
              />
              <StarRating
                value={reviewData.rating.professionalism}
                onChange={(value) => onUpdateRating('professionalism', value)}
                label="Professionalism"
              />
            </>
          ) : (
            <>
              <StarRating
                value={reviewData.rating.clarity}
                onChange={(value) => onUpdateRating('clarity', value)}
                label="Requirements Clarity"
              />
              <StarRating
                value={reviewData.rating.responsiveness}
                onChange={(value) => onUpdateRating('responsiveness', value)}
                label="Responsiveness"
              />
              <StarRating
                value={reviewData.rating.paymentTimeliness}
                onChange={(value) => onUpdateRating('paymentTimeliness', value)}
                label="Payment Timeliness"
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
