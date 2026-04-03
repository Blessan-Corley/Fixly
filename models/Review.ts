// Re-export barrel — implementations live in models/review/
import mongoose from 'mongoose';

import { ReviewSchema } from './review/schema';

// Register side-effect modules (indexes, virtuals, methods, statics, hooks)
import './review/indexes';
import './review/virtuals';
import './review/methods';
import './review/statics';
import './review/hooks';

import type { Review, ReviewModel } from './review/types';

export type {
  AverageRatingResult,
  HelpfulVotes,
  ReportedReviewEntry,
  Review,
  ReviewAttachment,
  ReviewDocument,
  ReviewMethods,
  ReviewModel,
  ReviewRating,
  ReviewResponse,
  ReviewStatus,
  ReviewTag,
  ReviewType,
} from './review/types';

export default (mongoose.models.Review as ReviewModel) ||
  mongoose.model<Review, ReviewModel>('Review', ReviewSchema);
