import {
  createEmptyReplyArray,
  type CommentEntry,
  type JobDocument,
  type MentionEntry,
  type ObjectIdLike,
  type ReplyEntry,
} from '../types';

export function addComment(this: JobDocument, authorId: ObjectIdLike, message: string) {
  this.comments.push({
    author: authorId,
    message,
    likes: [],
    reactions: [],
    mentions: [],
    edited: {
      isEdited: false,
      editHistory: [],
    },
    replies: createEmptyReplyArray(),
    createdAt: new Date(),
  } as CommentEntry);

  return this.save();
}

export function addReply(
  this: JobDocument,
  commentId: ObjectIdLike,
  authorId: ObjectIdLike,
  message: string
) {
  const comment = this.comments.id(commentId);
  if (!comment) return false;

  comment.replies.push({
    author: authorId,
    message,
    likes: [],
    reactions: [],
    mentions: [],
    edited: {
      isEdited: false,
      editHistory: [],
    },
    createdAt: new Date(),
  } as ReplyEntry);

  return this.save();
}

export function deleteComment(this: JobDocument, commentId: ObjectIdLike, userId: ObjectIdLike) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };

  const isAuthor = comment.author.toString() === userId.toString();
  const isJobCreator = this.createdBy.toString() === userId.toString();

  if (!isAuthor && !isJobCreator) {
    return { success: false, message: 'Unauthorized to delete this comment' };
  }

  comment.deleteOne?.();
  return { success: true, message: 'Comment deleted successfully' };
}

export function deleteReply(
  this: JobDocument,
  commentId: ObjectIdLike,
  replyId: ObjectIdLike,
  userId: ObjectIdLike
) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };

  const reply = comment.replies.id(replyId);
  if (!reply) return { success: false, message: 'Reply not found' };

  const isAuthor = reply.author.toString() === userId.toString();
  const isJobCreator = this.createdBy.toString() === userId.toString();

  if (!isAuthor && !isJobCreator) {
    return { success: false, message: 'Unauthorized to delete this reply' };
  }

  reply.deleteOne?.();
  return { success: true, message: 'Reply deleted successfully' };
}

export function editComment(
  this: JobDocument,
  commentId: ObjectIdLike,
  userId: ObjectIdLike,
  newMessage: string,
  mentions: MentionEntry[] = []
) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };

  const isAuthor = comment.author.toString() === userId.toString();
  if (!isAuthor) {
    return { success: false, message: 'Only the author can edit this comment' };
  }

  if (!comment.edited.editHistory) {
    comment.edited.editHistory = [];
  }

  comment.edited.editHistory.push({
    originalMessage: comment.message,
    editedAt: new Date(),
  });

  comment.message = newMessage;
  comment.mentions = mentions;
  comment.edited.isEdited = true;
  comment.edited.editedAt = new Date();

  return { success: true, message: 'Comment updated successfully', comment };
}

export function editReply(
  this: JobDocument,
  commentId: ObjectIdLike,
  replyId: ObjectIdLike,
  userId: ObjectIdLike,
  newMessage: string,
  mentions: MentionEntry[] = []
) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };

  const reply = comment.replies.id(replyId);
  if (!reply) return { success: false, message: 'Reply not found' };

  const isAuthor = reply.author.toString() === userId.toString();
  if (!isAuthor) {
    return { success: false, message: 'Only the author can edit this reply' };
  }

  if (!reply.edited.editHistory) {
    reply.edited.editHistory = [];
  }

  reply.edited.editHistory.push({
    originalMessage: reply.message,
    editedAt: new Date(),
  });

  reply.message = newMessage;
  reply.mentions = mentions;
  reply.edited.isEdited = true;
  reply.edited.editedAt = new Date();

  return { success: true, message: 'Reply updated successfully', reply };
}
