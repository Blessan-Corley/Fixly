'use client';

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

export function useReviewPage() {
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

  const isClient = job ? getParticipantId(job.client) === sessionUserId : false;
  const reviewee = job ? (isClient ? job.fixer : job.client) ?? job.client : null;
  const completedDateLabel =
    job?.completedAt && !Number.isNaN(new Date(job.completedAt).getTime())
      ? new Date(job.completedAt).toLocaleDateString()
      : 'Unknown date';

  return {
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
  };
}
