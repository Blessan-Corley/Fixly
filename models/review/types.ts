import mongoose, { type Model } from 'mongoose';

export type ReviewType = 'client_to_fixer' | 'fixer_to_client';
export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'removed';
export type ReviewTag =
  | 'excellent_work'
  | 'on_time'
  | 'great_communication'
  | 'professional'
  | 'exceeded_expectations'
  | 'fair_price'
  | 'clean_work'
  | 'polite'
  | 'experienced'
  | 'reliable'
  | 'creative'
  | 'efficient'
  | 'poor_quality'
  | 'late'
  | 'unprofessional'
  | 'overpriced'
  | 'miscommunication'
  | 'incomplete'
  | 'rude'
  | 'inexperienced'
  | 'clear_requirements'
  | 'responsive'
  | 'fair_payment'
  | 'understanding'
  | 'flexible'
  | 'prompt_payment'
  | 'good_communication'
  | 'unclear_requirements'
  | 'unresponsive'
  | 'payment_issues'
  | 'unrealistic_expectations'
  | 'poor_communication'
  | 'changed_requirements'
  | 'delayed_payment';

export interface ReviewRating {
  overall: number;
  workQuality?: number;
  communication?: number;
  punctuality?: number;
  professionalism?: number;
  clarity?: number;
  responsiveness?: number;
  paymentTimeliness?: number;
}

export interface ReviewAttachment {
  type?: 'image' | 'document';
  url?: string;
  filename?: string;
  description?: string;
}

export interface ReportedReviewEntry {
  user: mongoose.Types.ObjectId | string;
  reason: 'inappropriate' | 'spam' | 'false_review' | 'personal_attack' | 'other';
  description?: string;
  reportedAt: Date;
}

export interface HelpfulVotes {
  count: number;
  users: Array<mongoose.Types.ObjectId | string>;
}

export interface ReviewResponse {
  comment?: string;
  respondedAt?: Date;
}

export interface Review {
  job: mongoose.Types.ObjectId | string;
  reviewer: mongoose.Types.ObjectId | string;
  reviewee: mongoose.Types.ObjectId | string;
  reviewType: ReviewType;
  rating: ReviewRating;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend: boolean;
  wouldHireAgain?: boolean;
  tags?: ReviewTag[];
  attachments?: ReviewAttachment[];
  isPublic: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  response?: ReviewResponse;
  helpfulVotes: HelpfulVotes;
  reportedBy?: ReportedReviewEntry[];
  status: ReviewStatus;
  moderationNotes?: string;
  publishedAt?: Date;
}

export type ReviewDocument = mongoose.HydratedDocument<Review, ReviewMethods>;

export interface AverageRatingResult {
  average: number;
  total: number;
  distribution: Record<number, number>;
}

export interface ReviewMethods {
  markAsHelpful(userId: string): Promise<ReviewDocument>;
  removeHelpfulVote(userId: string): Promise<ReviewDocument>;
}

export interface ReviewModel extends Model<Review, object, ReviewMethods> {
  getAverageRating(userId: string): Promise<AverageRatingResult>;
  getDetailedRatings(
    userId: string,
    reviewType?: ReviewType
  ): Promise<Record<string, number> | null>;
}

export const toIdString = (value: mongoose.Types.ObjectId | string): string =>
  typeof value === 'string' ? value : value.toString();
