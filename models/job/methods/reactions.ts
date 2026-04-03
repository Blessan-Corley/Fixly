import type { JobDocument, LikeEntry, ObjectIdLike, ReactionEntry, ReactionType } from '../types';

export function toggleLike(this: JobDocument, userId: ObjectIdLike) {
  const existingLikeIndex = this.likes.findIndex(
    (like: LikeEntry) => like.user.toString() === userId.toString()
  );

  if (existingLikeIndex > -1) {
    this.likes.splice(existingLikeIndex, 1);
    return { liked: false, likeCount: this.likes.length };
  }

  this.likes.push({ user: userId });
  return { liked: true, likeCount: this.likes.length };
}

export function isLikedBy(this: JobDocument, userId: ObjectIdLike) {
  if (!userId) return false;
  return this.likes.some((like: LikeEntry) => like.user.toString() === userId.toString());
}

export function toggleCommentLike(
  this: JobDocument,
  commentId: ObjectIdLike,
  userId: ObjectIdLike
) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;

  const existingLikeIndex = comment.likes.findIndex(
    (like: LikeEntry) => like.user.toString() === userId.toString()
  );

  if (existingLikeIndex > -1) {
    comment.likes.splice(existingLikeIndex, 1);
    return { liked: false, likeCount: comment.likes.length };
  }

  comment.likes.push({ user: userId });
  return { liked: true, likeCount: comment.likes.length };
}

export function toggleReplyLike(
  this: JobDocument,
  commentId: ObjectIdLike,
  replyId: ObjectIdLike,
  userId: ObjectIdLike
) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;

  const reply = comment.replies.id(replyId);
  if (!reply) return null;

  const existingLikeIndex = reply.likes.findIndex(
    (like: LikeEntry) => like.user.toString() === userId.toString()
  );

  if (existingLikeIndex > -1) {
    reply.likes.splice(existingLikeIndex, 1);
    return { liked: false, likeCount: reply.likes.length };
  }

  reply.likes.push({ user: userId });
  return { liked: true, likeCount: reply.likes.length };
}

export function toggleCommentReaction(
  this: JobDocument,
  commentId: ObjectIdLike,
  userId: ObjectIdLike,
  reactionType: ReactionType
) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;

  const existingReactionIndex = comment.reactions.findIndex(
    (reaction: ReactionEntry) => reaction.user.toString() === userId.toString()
  );

  if (existingReactionIndex > -1) {
    const existingReaction = comment.reactions[existingReactionIndex];
    if (existingReaction.type === reactionType) {
      comment.reactions.splice(existingReactionIndex, 1);
      return { reacted: false, reactionType: null, count: comment.reactions.length };
    }

    existingReaction.type = reactionType;
    existingReaction.reactedAt = new Date();
    return { reacted: true, reactionType, count: comment.reactions.length };
  }

  comment.reactions.push({
    user: userId,
    type: reactionType,
    reactedAt: new Date(),
  });

  return { reacted: true, reactionType, count: comment.reactions.length };
}

export function toggleReplyReaction(
  this: JobDocument,
  commentId: ObjectIdLike,
  replyId: ObjectIdLike,
  userId: ObjectIdLike,
  reactionType: ReactionType
) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;

  const reply = comment.replies.id(replyId);
  if (!reply) return null;

  const existingReactionIndex = reply.reactions.findIndex(
    (reaction: ReactionEntry) => reaction.user.toString() === userId.toString()
  );

  if (existingReactionIndex > -1) {
    const existingReaction = reply.reactions[existingReactionIndex];
    if (existingReaction.type === reactionType) {
      reply.reactions.splice(existingReactionIndex, 1);
      return { reacted: false, reactionType: null, count: reply.reactions.length };
    }

    existingReaction.type = reactionType;
    existingReaction.reactedAt = new Date();
    return { reacted: true, reactionType, count: reply.reactions.length };
  }

  reply.reactions.push({
    user: userId,
    type: reactionType,
    reactedAt: new Date(),
  });

  return { reacted: true, reactionType, count: reply.reactions.length };
}
