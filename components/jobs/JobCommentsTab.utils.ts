import type {
  ExtendedUserPlan,
  JobComment,
  JobDetails,
} from '../../app/dashboard/jobs/[jobId]/page.types';

export type CommentUser = {
  _id?: string;
  role?: string;
  photoURL?: string;
  plan?: ExtendedUserPlan;
};

export type JobLike = Pick<JobDetails, 'hasApplied'>;
export type LikeEntry = NonNullable<JobComment['likes']>[number];

export type JobCommentsTabProps = {
  comments: JobComment[];
  user?: CommentUser | null;
  job?: JobLike | null;
  newComment: string;
  replyingTo: string | null;
  replyText: string;
  submittingReply: boolean;
  submittingComment: boolean;
  onNewCommentChange: (value: string) => void;
  onReplyingToChange: (value: string | null) => void;
  onReplyTextChange: (value: string) => void;
  onAddComment: () => void;
  onAddReply: (commentId: string) => void;
  onLikeComment: (commentId: string) => void;
  onLikeReply: (commentId: string, replyId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onDeleteReply: (commentId: string, replyId: string) => void;
  onUpgrade: () => void;
  canUserComment: (
    user: CommentUser | null | undefined,
    job: JobLike | null | undefined
  ) => boolean;
  canApplyToJob: (user: CommentUser | null | undefined) => boolean;
  getTimeAgo: (timestamp?: string | Date) => string;
};

export const hasUserLiked = (likes: LikeEntry[] | undefined, userId?: string): boolean => {
  if (!userId || !Array.isArray(likes)) return false;
  return likes.some((entry) =>
    typeof entry === 'string' ? entry === userId : entry.user === userId
  );
};
