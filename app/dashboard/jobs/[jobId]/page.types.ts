import type { AppUser } from '../../../providers';

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | string;
export type JobUrgency = 'asap' | 'flexible' | 'scheduled' | string;

export type JobAction =
  | 'mark_in_progress'
  | 'mark_completed'
  | 'confirm_completion'
  | 'confirm_progress'
  | 'mark_arrived'
  | 'accept_application'
  | 'reject_application';

export type ExtendedUserPlan = {
  type?: string;
  status?: string;
  creditsUsed?: number;
};

export type DashboardUser = AppUser & {
  photoURL?: string;
  skills?: string[];
  plan?: ExtendedUserPlan;
};

export type RatingValue = {
  rating: number;
};

export type UserSummary = {
  _id?: string;
  id?: string;
  name?: string;
  photoURL?: string;
  location?: {
    city?: string;
    state?: string;
  };
  rating?: {
    average?: number;
    count?: number;
  };
  isVerified?: boolean;
  jobsCompleted?: number;
};

export type JobAttachment = {
  id?: string;
  url: string;
  name?: string;
  type?: string;
  size?: number;
  thumbnail?: string;
  isImage?: boolean;
  isVideo?: boolean;
};

export type JobCommentReply = {
  _id: string;
  author?: UserSummary;
  message?: string;
  createdAt?: string | Date;
  likes?: Array<string | { user?: string }>;
};

export type JobComment = {
  _id: string;
  author?: UserSummary;
  message?: string;
  createdAt?: string | Date;
  likes?: Array<string | { user?: string }>;
  replies?: JobCommentReply[];
};

export type JobApplication = {
  _id: string;
  fixer: UserSummary;
  proposedAmount?: number;
  status?: string;
  appliedAt?: string | Date;
  coverLetter?: string;
  workPlan?: string;
  requirements?: string;
  specialNotes?: string;
  materialsIncluded?: boolean;
  materialsList?: Array<{
    item?: string;
    quantity?: number | string;
    estimatedCost?: number | string;
  }>;
  timeEstimate?: {
    value?: number | string;
    unit?: string;
  };
};

export type JobDetails = {
  _id?: string;
  title: string;
  description: string;
  status: JobStatus;
  urgency: JobUrgency;
  featured?: boolean;
  canMessage?: boolean;
  hasApplied?: boolean;
  isLocalJob?: boolean;
  skillMatchPercentage?: number;
  skillsRequired: string[];
  budget: {
    type?: string;
    amount?: number;
    materialsIncluded?: boolean;
  };
  location: {
    city?: string;
    state?: string;
    address?: string;
    pincode?: string;
  };
  deadline?: string | Date;
  scheduledDate?: string | Date;
  createdAt?: string | Date;
  type?: string;
  experienceLevel?: string;
  estimatedDuration?: {
    value?: number | string;
    unit?: string;
  };
  applicationCount?: number;
  commentCount?: number;
  views?: {
    count?: number;
  };
  attachments?: JobAttachment[];
  createdBy: UserSummary;
  assignedTo?: UserSummary | null;
  progress?: {
    arrivedAt?: string | Date;
    startedAt?: string | Date;
    completedAt?: string | Date;
  };
  completion?: {
    confirmedBy?: string;
    hirerRating?: RatingValue;
    fixerRating?: RatingValue;
  };
};

export type JobDetailsResponse = {
  job?: JobDetails;
  message?: string;
};

export type ApplicationsResponse = {
  applications?: JobApplication[];
  message?: string;
  needsUpgrade?: boolean;
};

export type CommentsResponse = {
  comments?: JobComment[];
  message?: string;
};

export type GenericResponse = {
  success?: boolean;
  message?: string;
  needsUpgrade?: boolean;
  [key: string]: unknown;
};

export type JobActionRequestData = {
  applicationId?: string;
};

export type JobActionRequestBody = {
  action: JobAction;
  data?: JobActionRequestData;
};

export type ReplyLikePayload = {
  replyId: string;
};

export type DeleteReplyPayload = {
  commentId: string;
  replyId: string;
};
