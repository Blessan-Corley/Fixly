'use client';

import { AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { toast } from 'sonner';

import { ReviewFormSchema, zodResolver } from './review.schema';
import type {
  JobDetailsPayload,
  JobReviewDetails,
  ProsConsType,
  RatingCategory,
  ReviewFormData,
  ReviewType,
  SubmitReviewPayload,
} from './review.types';
import { INITIAL_REVIEW_DATA } from './review.types';
import {
  asString,
  getParticipantId,
  normalizeJob,
  parseJson,
} from './review.utils';
import ReviewDetailsSection from './ReviewDetailsSection';
import ReviewJobSidebar from './ReviewJobSidebar';
import ReviewProsConsSection from './ReviewProsConsSection';
import ReviewRatingsSection from './ReviewRatingsSection';
import ReviewRecommendationsSection from './ReviewRecommendationsSection';
import ReviewTagsSection from './ReviewTagsSection';

export default function ReviewJobPage() {
  const params = useParams<{ jobId?: string | string[] }>();
  const rawJobId = params?.jobId;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId ?? '');

  const router = useRouter();
  const { data: session } = useSession();
  const sessionUserId = asString(session?.user?.id);

  const [job, setJob] = useState<JobReviewDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit: submitWithValidation,
    formState: { isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: INITIAL_REVIEW_DATA,
  });

  const reviewData = watch() as ReviewFormData;

  useEffect(() => {
    (Object.keys(INITIAL_REVIEW_DATA) as Array<keyof ReviewFormData>).forEach((field) => {
      register(field);
    });
    register('rating.overall' as keyof ReviewFormData);
    register('rating.workQuality' as keyof ReviewFormData);
    register('rating.communication' as keyof ReviewFormData);
    register('rating.punctuality' as keyof ReviewFormData);
    register('rating.professionalism' as keyof ReviewFormData);
    register('rating.clarity' as keyof ReviewFormData);
    register('rating.responsiveness' as keyof ReviewFormData);
    register('rating.paymentTimeliness' as keyof ReviewFormData);
  }, [register]);

  const setReviewData = (updater: (previous: ReviewFormData) => ReviewFormData): void => {
    const next = updater(getValues() as ReviewFormData);
    (Object.keys(next) as Array<keyof ReviewFormData>).forEach((field) => {
      setValue(field, next[field], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    });
  };

  useEffect(() => {
    if (!sessionUserId || !jobId) return;

    const fetchJobDetails = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await parseJson<JobDetailsPayload>(response);

        if (!data?.success) {
          toast.error(data?.message ?? 'Failed to fetch job details');
          router.push('/dashboard');
          return;
        }

        const normalizedJob = normalizeJob(data.job);
        if (!normalizedJob) {
          toast.error('Failed to parse job details');
          router.push('/dashboard');
          return;
        }

        setJob(normalizedJob);

        if (normalizedJob.status !== 'completed') {
          toast.error('Can only review completed jobs');
          router.push(`/jobs/${jobId}`);
          return;
        }

        const isClient = getParticipantId(normalizedJob.client) === sessionUserId;
        const isFixer = getParticipantId(normalizedJob.fixer) === sessionUserId;

        if (!isClient && !isFixer) {
          toast.error('You can only review jobs you were involved in');
          router.push(`/jobs/${jobId}`);
        }
      } catch (error) {
        console.error('Error fetching job details:', error);
        toast.error('Failed to fetch job details');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    void fetchJobDetails();
  }, [jobId, router, sessionUserId]);

  const updateRating = (category: RatingCategory, value: number): void => {
    setReviewData((prev) => ({
      ...prev,
      rating: { ...prev.rating, [category]: value },
    }));
  };

  const addProsOrCons = (type: ProsConsType): void => {
    setReviewData((prev) => ({ ...prev, [type]: [...prev[type], ''] }));
  };

  const removeProsOrCons = (type: ProsConsType, index: number): void => {
    setReviewData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const updateProsOrCons = (type: ProsConsType, index: number, value: string): void => {
    setReviewData((prev) => ({
      ...prev,
      [type]: prev[type].map((item, i) => (i === index ? value : item)),
    }));
  };

  const toggleTag = (tag: string): void => {
    setReviewData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const submitReview = async (): Promise<void> => {
    if (!reviewData.rating.overall) {
      toast.error('Please provide an overall rating');
      return;
    }
    if (!reviewData.title.trim() || !reviewData.comment.trim()) {
      toast.error('Please provide a title and comment');
      return;
    }
    if (!job || !sessionUserId || !jobId) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    try {
      const isClient = getParticipantId(job.client) === sessionUserId;
      const reviewType: ReviewType = isClient ? 'client_to_fixer' : 'fixer_to_client';

      const response = await fetch(`/api/jobs/${jobId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewData.rating.overall,
          review: reviewData.comment,
          comment: reviewData.comment,
          title: reviewData.title,
          reviewType,
        }),
      });

      const data = await parseJson<SubmitReviewPayload>(response);

      if (response.ok && data?.success) {
        toast.success('Review submitted successfully!');
        router.push(`/jobs/${jobId}`);
      } else {
        toast.error(data?.message ?? 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    }
  };

  const onInvalidSubmit: SubmitErrorHandler<ReviewFormData> = (): void => {
    toast.error('Please provide an overall rating');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-fixly-text">Job not found</h1>
        </div>
      </div>
    );
  }

  const isClient = getParticipantId(job.client) === sessionUserId;
  const reviewee = (isClient ? job.fixer : job.client) ?? job.client;
  const completedDateLabel =
    job.completedAt && !Number.isNaN(new Date(job.completedAt).getTime())
      ? new Date(job.completedAt).toLocaleDateString()
      : 'Unknown date';

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
