export type ApplicationFormData = {
  proposedAmount: string;
  message: string;
  estimatedTime: string;
};

export type JobBudget = {
  type: string;
  amount: number | null;
  min: number | null;
  max: number | null;
};

export type JobRating = {
  average: number | null;
  count: number;
};

export type JobUser = {
  id: string;
  name: string;
  photoURL: string | null;
  rating: JobRating;
  createdAt: string | null;
};

export type JobApplication = {
  fixerId: string;
};

export type JobDetails = {
  _id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  createdAt: string;
  distance: number | null;
  viewsCount: number;
  commentsCount: number;
  locationCity: string;
  budget: JobBudget;
  timelineExpected: string;
  skillsRequired: string[];
  createdBy: JobUser | null;
  hirerId: string;
  client: JobUser | null;
  fixer: JobUser | null;
  applicationCount: number;
  applications: JobApplication[];
};

export type ReviewResponse = {
  comment: string;
};

export type ReviewItem = {
  _id: string;
  reviewer: JobUser;
  reviewerId: string;
  reviewType: string;
  title: string;
  comment: string;
  tags: string[];
  createdAt: string;
  helpfulVotesCount: number;
  wouldRecommend: boolean;
  response: ReviewResponse | null;
  ratingOverall: number;
};

export type JobApiPayload = {
  job?: unknown;
  message?: unknown;
};

export type ReviewsApiPayload = {
  success?: unknown;
  reviews?: unknown;
  data?: unknown;
  message?: unknown;
};
