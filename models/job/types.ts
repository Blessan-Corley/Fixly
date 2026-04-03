import mongoose from 'mongoose';

export type AnyRecord = Record<string, unknown>;
export type ObjectIdLike = mongoose.Types.ObjectId | string;
export type ReactionType = 'thumbs_up' | 'thumbs_down' | 'heart' | 'laugh' | 'wow' | 'angry';
export type ArrayWithId<T> = T[] & { id: (id: ObjectIdLike) => T | null | undefined };

export type LikeEntry = {
  user: ObjectIdLike;
};

export type ReactionEntry = {
  user: ObjectIdLike;
  type: ReactionType;
  reactedAt?: Date;
};

export type MentionEntry = {
  user: ObjectIdLike;
  startIndex: number;
  endIndex: number;
};

export type EditHistoryEntry = {
  originalMessage: string;
  editedAt: Date;
};

export type ReplyEntry = {
  _id?: ObjectIdLike;
  author: ObjectIdLike;
  message: string;
  createdAt?: Date;
  likes: LikeEntry[];
  reactions: ReactionEntry[];
  mentions: MentionEntry[];
  edited: {
    isEdited: boolean;
    editedAt?: Date;
    editHistory?: EditHistoryEntry[];
  };
  deleteOne?: () => void;
};

export type CommentEntry = {
  _id?: ObjectIdLike;
  author: ObjectIdLike;
  message: string;
  createdAt?: Date;
  likes: LikeEntry[];
  reactions: ReactionEntry[];
  mentions: MentionEntry[];
  edited: {
    isEdited: boolean;
    editedAt?: Date;
    editHistory?: EditHistoryEntry[];
  };
  replies: ArrayWithId<ReplyEntry>;
  deleteOne?: () => void;
};

export function createEmptyReplyArray(): ArrayWithId<ReplyEntry> {
  return Object.assign([] as ReplyEntry[], {
    id: (_id: ObjectIdLike) => undefined,
  });
}

export type ApplicationEntry = {
  _id?: ObjectIdLike;
  fixer: ObjectIdLike;
  status: string;
};

export type ViewerEntry = {
  userId?: ObjectIdLike;
  viewedAt: Date | string;
  ipAddress?: string;
  userAgent?: string;
};

export type DailyViewEntry = {
  date: string;
  count: number;
};

export type MilestoneEntry = {
  _id?: ObjectIdLike;
  title?: string;
  description?: string;
  completed: boolean;
  completedAt?: Date;
};

export type PartyRating = {
  rating?: number;
  review?: string;
  categories?: {
    communication?: number;
    quality?: number;
    timeliness?: number;
    professionalism?: number;
  };
  ratedBy?: ObjectIdLike;
  ratedAt?: Date;
};

export type ReviewInput = {
  overall: number;
  comment?: string;
  communication: number;
  quality: number;
  timeliness: number;
  professionalism: number;
};

export type JobDocument = {
  createdBy: ObjectIdLike;
  assignedTo?: ObjectIdLike | null;
  status: string;
  urgency?: string;
  type?: string;
  experienceLevel?: string;
  deadline?: Date | string;
  featured?: boolean;
  featuredUntil?: Date;
  skillsRequired?: string[];
  budget: {
    type?: string;
    amount?: number;
  };
  applications: ArrayWithId<ApplicationEntry>;
  comments: ArrayWithId<CommentEntry>;
  likes: LikeEntry[];
  views: {
    count: number;
    uniqueViewers: ViewerEntry[];
    dailyViews: DailyViewEntry[];
  };
  progress: {
    startedAt?: Date;
    milestones: ArrayWithId<MilestoneEntry>;
    markedDoneAt?: Date;
    completedAt?: Date;
  };
  dispute: {
    raised: boolean;
    raisedBy?: ObjectIdLike;
    reason?: string;
    description?: string;
    evidence?: string[];
    createdAt?: Date;
  };
  cancellation: {
    cancelled: boolean;
    cancelledBy?: ObjectIdLike;
    reason?: string;
    cancelledAt?: Date;
  };
  completion: {
    markedDoneBy?: ObjectIdLike;
    markedDoneAt?: Date;
    completionNotes?: string;
    afterImages?: string[];
    confirmedBy?: ObjectIdLike;
    confirmedAt?: Date;
    rating?: number;
    review?: string;
    fixerRating?: PartyRating;
    hirerRating?: PartyRating;
    reviewStatus?: string;
    messagingClosed?: boolean;
    messagingClosedAt?: Date;
  };
  $locals?: Record<string, unknown>;
  _original?: { status?: string };
  isModified: (path: string) => boolean;
  save: () => Promise<unknown>;
  closeMessaging: () => Promise<unknown>;
  updateReviewStatus: () => void;
};

export type ViewTrackingResult = {
  count: number;
  didIncrement: boolean;
};
