import type mongoose from 'mongoose';

import {
  acceptApplication,
  canApply,
  getApplicationForFixer,
} from './methods/applications';
import { addComment, addReply, deleteComment, deleteReply, editComment, editReply } from './methods/comments';
import { closeMessaging, getJobParticipants, isMessagingAllowed } from './methods/messaging';
import { addMilestone, completeMilestone } from './methods/milestones';
import {
  isLikedBy,
  toggleCommentLike,
  toggleCommentReaction,
  toggleLike,
  toggleReplyLike,
  toggleReplyReaction,
} from './methods/reactions';
import {
  getReviewStatusForUI,
  submitReview,
  updateReviewStatus,
} from './methods/reviews';
import { addView } from './methods/views';
import {
  cancelJob,
  confirmCompletion,
  markDone,
  raiseDispute,
} from './methods/workflow';

export function addJobMethods(schema: mongoose.Schema): void {
  schema.methods.canApply = canApply;
  schema.methods.getApplicationByFixer = getApplicationForFixer;
  schema.methods.acceptApplication = acceptApplication;
  schema.methods.markDone = markDone;
  schema.methods.confirmCompletion = confirmCompletion;
  schema.methods.addComment = addComment;
  schema.methods.addReply = addReply;
  schema.methods.addView = addView;
  schema.methods.raiseDispute = raiseDispute;
  schema.methods.cancelJob = cancelJob;
  schema.methods.addMilestone = addMilestone;
  schema.methods.completeMilestone = completeMilestone;
  schema.methods.toggleLike = toggleLike;
  schema.methods.isLikedBy = isLikedBy;
  schema.methods.toggleCommentLike = toggleCommentLike;
  schema.methods.toggleReplyLike = toggleReplyLike;
  schema.methods.deleteComment = deleteComment;
  schema.methods.deleteReply = deleteReply;
  schema.methods.toggleCommentReaction = toggleCommentReaction;
  schema.methods.toggleReplyReaction = toggleReplyReaction;
  schema.methods.editComment = editComment;
  schema.methods.editReply = editReply;
  schema.methods.submitReview = submitReview;
  schema.methods.updateReviewStatus = updateReviewStatus;
  schema.methods.closeMessaging = closeMessaging;
  schema.methods.isMessagingAllowed = isMessagingAllowed;
  schema.methods.getReviewStatusForUI = getReviewStatusForUI;
  schema.methods.getJobParticipants = getJobParticipants;
}
