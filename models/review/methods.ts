import { ReviewSchema } from './schema';
import { toIdString } from './types';
import type { ReviewDocument } from './types';

ReviewSchema.methods.markAsHelpful = function (this: ReviewDocument, userId: string) {
  const hasVoted = this.helpfulVotes.users.some(
    (existingUserId) => toIdString(existingUserId) === userId.toString()
  );

  if (!hasVoted) {
    this.helpfulVotes.users.push(userId);
    this.helpfulVotes.count += 1;
    return this.save();
  }

  return Promise.resolve(this);
};

ReviewSchema.methods.removeHelpfulVote = function (this: ReviewDocument, userId: string) {
  const index = this.helpfulVotes.users.findIndex(
    (existingUserId) => toIdString(existingUserId) === userId.toString()
  );

  if (index > -1) {
    this.helpfulVotes.users.splice(index, 1);
    this.helpfulVotes.count = Math.max(0, this.helpfulVotes.count - 1);
    return this.save();
  }

  return Promise.resolve(this);
};
