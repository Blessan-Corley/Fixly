export type RatingCategory =
  | 'overall'
  | 'workQuality'
  | 'communication'
  | 'punctuality'
  | 'professionalism'
  | 'clarity'
  | 'responsiveness'
  | 'paymentTimeliness';

export type ProsConsType = 'pros' | 'cons';
export type ReviewType = 'client_to_fixer' | 'fixer_to_client';
export type ReviewRating = Record<RatingCategory, number>;

export type ReviewFormData = {
  rating: ReviewRating;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  tags: string[];
  wouldRecommend: boolean;
  wouldHireAgain: boolean;
};

export type UserRatingSummary = {
  average: number;
  count: number;
};

export type JobParticipant = {
  _id: string;
  name: string;
  username: string;
  photoURL?: string;
  rating?: UserRatingSummary;
};

export type JobReviewDetails = {
  _id: string;
  title: string;
  category: string;
  status: string;
  location: {
    address: string;
  };
  budget: {
    amount: number;
  };
  completedAt: string;
  client: JobParticipant;
  fixer: JobParticipant | null;
};

export type JobDetailsPayload = {
  success?: boolean;
  message?: string;
  job?: unknown;
};

export type SubmitReviewPayload = {
  success?: boolean;
  message?: string;
};

export const INITIAL_REVIEW_DATA: ReviewFormData = {
  rating: {
    overall: 0,
    workQuality: 0,
    communication: 0,
    punctuality: 0,
    professionalism: 0,
    clarity: 0,
    responsiveness: 0,
    paymentTimeliness: 0,
  },
  title: '',
  comment: '',
  pros: [''],
  cons: [''],
  tags: [],
  wouldRecommend: true,
  wouldHireAgain: true,
};

export const POSITIVE_TAGS_FOR_FIXER = [
  'excellent_work',
  'on_time',
  'great_communication',
  'professional',
  'exceeded_expectations',
  'fair_price',
  'clean_work',
  'polite',
  'experienced',
  'reliable',
  'creative',
  'efficient',
] as const;

export const NEGATIVE_TAGS_FOR_FIXER = [
  'poor_quality',
  'late',
  'unprofessional',
  'overpriced',
  'miscommunication',
  'incomplete',
  'rude',
  'inexperienced',
] as const;

export const POSITIVE_TAGS_FOR_CLIENT = [
  'clear_requirements',
  'responsive',
  'fair_payment',
  'professional',
  'understanding',
  'flexible',
  'prompt_payment',
  'good_communication',
] as const;

export const NEGATIVE_TAGS_FOR_CLIENT = [
  'unclear_requirements',
  'unresponsive',
  'payment_issues',
  'unrealistic_expectations',
  'poor_communication',
  'changed_requirements',
  'delayed_payment',
  'rude',
] as const;
