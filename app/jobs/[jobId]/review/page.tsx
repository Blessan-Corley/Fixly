'use client';

import { AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

import ReviewDetailsSection from './ReviewDetailsSection';
import ReviewJobSidebar from './ReviewJobSidebar';
import ReviewProsConsSection from './ReviewProsConsSection';
import ReviewRatingsSection from './ReviewRatingsSection';
import ReviewRecommendationsSection from './ReviewRecommendationsSection';
import ReviewTagsSection from './ReviewTagsSection';
import { useReviewPage } from './useReviewPage';

export default function ReviewJobPage() {
  const router = useRouter();
  const {
    job,
    loading,
    reviewData,
    isSubmitting,
    isClient,
    reviewee,
    completedDateLabel,
    submitWithValidation,
    submitReview,
    onInvalidSubmit,
    setReviewData,
    updateRating,
    addProsOrCons,
    removeProsOrCons,
    updateProsOrCons,
    toggleTag,
  } = useReviewPage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!job || !reviewee) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-fixly-text">Job not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-fixly-text-light hover:text-fixly-accent"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Job
          </button>
          <h1 className="mb-2 text-3xl font-bold text-fixly-text">Write a Review</h1>
          <p className="text-fixly-text-light">
            Share your experience working {isClient ? 'with' : 'for'} {reviewee.name}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ReviewJobSidebar
              job={job}
              reviewee={reviewee}
              completedDateLabel={completedDateLabel}
            />
          </div>

          <div className="lg:col-span-2">
            <form
              onSubmit={submitWithValidation(submitReview, onInvalidSubmit)}
              className="space-y-8"
            >
              <ReviewRatingsSection
                reviewData={reviewData}
                isClient={isClient}
                onUpdateRating={updateRating}
              />

              <ReviewDetailsSection reviewData={reviewData} setReviewData={setReviewData} />

              <ReviewProsConsSection
                reviewData={reviewData}
                onAdd={addProsOrCons}
                onRemove={removeProsOrCons}
                onUpdate={updateProsOrCons}
              />

              <ReviewTagsSection
                isClient={isClient}
                selectedTags={reviewData.tags}
                onToggle={toggleTag}
              />

              <ReviewRecommendationsSection
                reviewData={reviewData}
                isClient={isClient}
                revieweeName={reviewee.name}
                isSubmitting={isSubmitting}
                setReviewData={setReviewData}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
