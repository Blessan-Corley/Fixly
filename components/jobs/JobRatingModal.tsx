'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';

import type {
  RatingCategories,
  RatingFormData,
} from '../../app/dashboard/jobs/[jobId]/page.helpers';

type UserRole = 'hirer' | 'fixer' | string | undefined;
type RatingCategoryKey = keyof RatingCategories;

type JobRatingModalProps = {
  isOpen: boolean;
  userRole?: UserRole;
  ratingData: RatingFormData;
  onClose: () => void;
  onSubmit: () => void;
  onRatingChange: (rating: number) => void;
  onCategoryChange: (key: RatingCategoryKey, value: number) => void;
  onReviewChange: (review: string) => void;
};

const ratingLabels: Record<number, string> = {
  0: 'Select a rating',
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export default function JobRatingModal({
  isOpen,
  userRole,
  ratingData,
  onClose,
  onSubmit,
  onRatingChange,
  onCategoryChange,
  onReviewChange,
}: JobRatingModalProps) {
  const categoryLabels: Record<RatingCategoryKey, string> = {
    communication: 'Communication',
    quality: userRole === 'hirer' ? 'Work Quality' : 'Clarity of Requirements',
    timeliness: 'Timeliness',
    professionalism: 'Professionalism',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-fixly-text">
                Rate {userRole === 'hirer' ? 'Fixer' : 'Client'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-fixly-text">
                  Overall Rating *
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => onRatingChange(star)}
                      aria-label={`Set overall rating to ${star} star${star > 1 ? 's' : ''}`}
                      className={`text-2xl ${
                        star <= ratingData.rating ? 'text-yellow-500' : 'text-gray-300'
                      } transition-colors hover:text-yellow-400`}
                    >
                      <Star className="h-7 w-7" fill="currentColor" />
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-fixly-text-muted">
                  {ratingLabels[ratingData.rating] ?? 'Select a rating'}
                </p>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-fixly-text">
                  Detailed Ratings
                </label>

                {(Object.keys(categoryLabels) as RatingCategoryKey[]).map((key) => (
                  <div key={key} className="mb-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-fixly-text">{categoryLabels[key]}</span>
                      <span className="text-xs text-fixly-text-muted">
                        {ratingData.categories[key] || 0}/5
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => onCategoryChange(key, star)}
                          aria-label={`Set ${categoryLabels[key]} rating to ${star} star${star > 1 ? 's' : ''}`}
                          className={`text-lg ${
                            star <= ratingData.categories[key] ? 'text-yellow-500' : 'text-gray-300'
                          } transition-colors hover:text-yellow-400`}
                        >
                          <Star className="h-5 w-5" fill="currentColor" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-fixly-text">
                  Written Review (Optional)
                </label>
                <textarea
                  rows={4}
                  value={ratingData.review}
                  onChange={(e) => onReviewChange(e.target.value)}
                  className="input"
                  placeholder={`Share your experience with this ${userRole === 'hirer' ? 'fixer' : 'client'}...`}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-fixly-text-muted">
                  {ratingData.review.length}/500 characters
                </p>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Skip for Now
              </button>
              <button
                type="button"
                onClick={onSubmit}
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
  );
}
