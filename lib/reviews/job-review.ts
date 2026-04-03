type LegacyReviewType = 'hirer_to_fixer' | 'fixer_to_hirer';
type PublicReviewType = 'client_to_fixer' | 'fixer_to_client';

export type CanonicalCompletionCategories = {
  communication: number;
  quality: number;
  timeliness: number;
  professionalism: number;
};

type ReviewCompletionState = {
  fixerRating?: { ratedAt?: Date | string };
  hirerRating?: { ratedAt?: Date | string };
  reviewMessagesSent?: boolean;
  messagingClosed?: boolean;
};

type JobReviewParticipantShape = {
  createdBy?: unknown;
  assignedTo?: unknown;
  completion?: ReviewCompletionState;
  submitReview?: (
    reviewerId: string,
    reviewData: {
      overall: number;
      comment?: string;
      communication: number;
      quality: number;
      timeliness: number;
      professionalism: number;
    }
  ) => Promise<unknown>;
  getReviewStatusForUI?: (userId: string) => {
    canReview: boolean;
    hasReviewed: boolean;
    otherPartyReviewed: boolean;
    bothReviewsComplete: boolean;
    messagingClosed: boolean;
  };
};

type JobReviewContext = {
  isHirer: boolean;
  isFixer: boolean;
  legacyReviewType: LegacyReviewType;
  publicReviewType: PublicReviewType;
  reviewerRole: 'hirer' | 'fixer';
  revieweeId: string | null;
  completionTarget: 'fixerRating' | 'hirerRating';
};

type CategoryInput = {
  categories?: Record<string, unknown> | null;
  source?: Record<string, unknown> | null;
  overall: number;
};

type CompletionReviewStatus = {
  canReview: boolean;
  hasReviewed: boolean;
  otherPartyReviewed: boolean;
  bothReviewsComplete: boolean;
  messagingClosed: boolean;
};

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

function parseBoundedRating(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) return null;
  return Number(numeric.toFixed(1));
}

export function normalizeLegacyReviewType(value: unknown): LegacyReviewType | null {
  if (typeof value !== 'string') return null;
  if (value === 'hirer_to_fixer' || value === 'client_to_fixer') return 'hirer_to_fixer';
  if (value === 'fixer_to_hirer' || value === 'fixer_to_client') return 'fixer_to_hirer';
  return null;
}

export function resolveJobReviewContext(
  job: Pick<JobReviewParticipantShape, 'createdBy' | 'assignedTo'>,
  userId: string
): JobReviewContext | null {
  const hirerId = toIdString(job.createdBy);
  const fixerId = toIdString(job.assignedTo);
  const isHirer = hirerId === userId;
  const isFixer = !!fixerId && fixerId === userId;

  if (!isHirer && !isFixer) {
    return null;
  }

  return {
    isHirer,
    isFixer,
    legacyReviewType: isHirer ? 'hirer_to_fixer' : 'fixer_to_hirer',
    publicReviewType: isHirer ? 'client_to_fixer' : 'fixer_to_client',
    reviewerRole: isHirer ? 'hirer' : 'fixer',
    revieweeId: isHirer ? fixerId || null : hirerId || null,
    completionTarget: isHirer ? 'fixerRating' : 'hirerRating',
  };
}

export function normalizeCompletionReviewCategories(
  input: CategoryInput
): CanonicalCompletionCategories {
  const categories = input.categories || {};
  const source = input.source || {};
  const overall = input.overall;

  const communication =
    parseBoundedRating(categories.communication ?? source.communication ?? source.clarity) ??
    overall;
  const quality =
    parseBoundedRating(
      categories.quality ?? source.quality ?? source.workQuality ?? source.responsiveness
    ) ?? overall;
  const timeliness =
    parseBoundedRating(
      categories.timeliness ?? source.timeliness ?? source.punctuality ?? source.paymentTimeliness
    ) ?? overall;
  const professionalism =
    parseBoundedRating(categories.professionalism ?? source.professionalism) ?? overall;

  return {
    communication,
    quality,
    timeliness,
    professionalism,
  };
}

export function hasExistingCompletionReview(
  job: Pick<JobReviewParticipantShape, 'completion'>,
  target: 'fixerRating' | 'hirerRating'
): boolean {
  return Boolean(job.completion?.[target]?.ratedAt);
}

export async function submitJobCompletionReview(
  job: JobReviewParticipantShape,
  reviewerId: string,
  reviewData: {
    overall: number;
    comment?: string;
    categories: CanonicalCompletionCategories;
  }
): Promise<void> {
  if (typeof job.submitReview !== 'function') {
    throw new Error('Job review submission is not available');
  }

  await job.submitReview(reviewerId, {
    overall: reviewData.overall,
    comment: reviewData.comment,
    ...reviewData.categories,
  });
}

export function getCompletionReviewStatus(
  job: JobReviewParticipantShape,
  userId: string
): CompletionReviewStatus {
  if (typeof job.getReviewStatusForUI === 'function') {
    return job.getReviewStatusForUI(userId);
  }

  const bothReviewsComplete = Boolean(
    job.completion?.fixerRating?.ratedAt && job.completion?.hirerRating?.ratedAt
  );

  return {
    canReview: false,
    hasReviewed: true,
    otherPartyReviewed: bothReviewsComplete,
    bothReviewsComplete,
    messagingClosed: Boolean(job.completion?.messagingClosed),
  };
}
