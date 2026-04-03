'use client';

export type NotificationItem = {
  id: string;
  type: string;
  read: boolean;
  timestamp: string;
  message?: string;
  createdAt?: string;
  actionUrl?: string;
  [key: string]: unknown;
};

export type ApiResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

export type TypingUser = {
  id: string;
  name?: string;
  timestamp: number;
};

export type PresenceMember = {
  [key: string]: unknown;
};

export type CommentAuthor = {
  _id?: string;
  name?: string;
  username?: string;
  photoURL?: string;
  role?: string;
};

export type LikeEntry = {
  user?: string;
  createdAt?: string;
};

export type ReactionEntry = {
  user?: string;
  type?: string;
  reactedAt?: string;
};

export type JobCommentReply = {
  _id?: string;
  author?: CommentAuthor;
  message?: string;
  createdAt?: string;
  likes?: LikeEntry[];
  reactions?: ReactionEntry[];
  edited?: {
    isEdited?: boolean;
    editedAt?: string;
  };
  mentions?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type JobComment = {
  _id?: string;
  author?: CommentAuthor;
  message?: string;
  createdAt?: string;
  likes?: LikeEntry[];
  reactions?: ReactionEntry[];
  edited?: {
    isEdited?: boolean;
    editedAt?: string;
  };
  mentions?: Array<Record<string, unknown>>;
  replies?: JobCommentReply[];
  [key: string]: unknown;
};

export type JobUpdateItem = {
  [key: string]: unknown;
};

export type JobApplicationItem = {
  [key: string]: unknown;
};

export type JobViewUpdate = {
  type?: string;
  applicationCount?: number;
  commentCount?: number;
  viewCount?: number;
};

export type JobRealtimeCounts = {
  applicationCount: number;
  commentCount: number;
  viewCount: number;
};

export type JobRealtimeCountOptions = Partial<JobRealtimeCounts>;
