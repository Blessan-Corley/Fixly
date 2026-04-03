import mongoose from 'mongoose';

import { logger } from '@/lib/logger';

import { ReviewSchema } from './schema';
import { toIdString } from './types';
import type { ReviewDocument, ReviewModel } from './types';

ReviewSchema.pre('save', function (this: ReviewDocument, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

ReviewSchema.post('save', async function (doc: ReviewDocument) {
  if (doc.status === 'published') {
    try {
      const UserModel = mongoose.model('User');
      const ratings = await (this.constructor as ReviewModel).getAverageRating(
        toIdString(doc.reviewee)
      );

      await UserModel.findByIdAndUpdate(doc.reviewee, {
        'rating.average': ratings.average,
        'rating.count': ratings.total,
        'rating.distribution': ratings.distribution,
      });
    } catch (error) {
      logger.error(
        { error, revieweeId: toIdString(doc.reviewee) },
        'Failed to update user rating after review save'
      );
    }
  }
});
