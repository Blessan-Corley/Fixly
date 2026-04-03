import { ReviewSchema } from './schema';
import type { ReviewDocument } from './types';

ReviewSchema.virtual('averageDetailedRating').get(function (this: ReviewDocument) {
  const ratings: number[] = [];

  if (this.reviewType === 'client_to_fixer') {
    if (this.rating.workQuality) ratings.push(this.rating.workQuality);
    if (this.rating.communication) ratings.push(this.rating.communication);
    if (this.rating.punctuality) ratings.push(this.rating.punctuality);
    if (this.rating.professionalism) ratings.push(this.rating.professionalism);
  } else {
    if (this.rating.clarity) ratings.push(this.rating.clarity);
    if (this.rating.responsiveness) ratings.push(this.rating.responsiveness);
    if (this.rating.paymentTimeliness) ratings.push(this.rating.paymentTimeliness);
  }

  return ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : this.rating.overall;
});
