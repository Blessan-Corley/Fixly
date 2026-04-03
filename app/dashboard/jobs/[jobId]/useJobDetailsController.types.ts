'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { JobApplicationFormData, RatingFormData } from './page.helpers';
import type {
  DashboardUser,
  JobAction,
  JobApplication,
  JobAttachment,
  JobComment,
  JobDetails,
} from './page.types';

export type ActiveTab = 'details' | 'applications' | 'comments';

export type UseJobDetailsControllerParams = {
  jobId: string;
  user: DashboardUser | null;
};

export type UseJobDetailsControllerResult = {
  activeTab: ActiveTab;
  applicationData: JobApplicationFormData;
  applications: JobApplication[];
  applying: boolean;
  comments: JobComment[];
  confirmApplication: () => Promise<void>;
  handleAcceptApplication: (applicationId: string) => Promise<void>;
  handleDetailedApplication: () => Promise<void>;
  handleJobAction: (action: JobAction) => Promise<void>;
  handleMessageFixer: (fixerId: string) => void;
  handleQuickApply: () => Promise<void>;
  handleRejectApplication: (applicationId: string) => Promise<void>;
  handleSubmitRating: () => Promise<void>;
  isAssignedFixer: boolean;
  isJobCreator: boolean;
  job: JobDetails | null;
  loading: boolean;
  ratingData: RatingFormData;
  selectedImage: JobAttachment | null;
  setActiveTab: (tab: ActiveTab) => void;
  setApplicationData: Dispatch<SetStateAction<JobApplicationFormData>>;
  setRatingData: Dispatch<SetStateAction<RatingFormData>>;
  setSelectedImage: Dispatch<SetStateAction<JobAttachment | null>>;
  setShowApplicationModal: Dispatch<SetStateAction<boolean>>;
  setShowConfirmModal: Dispatch<SetStateAction<boolean>>;
  setShowImageModal: Dispatch<SetStateAction<boolean>>;
  setShowInstagramComments: Dispatch<SetStateAction<boolean>>;
  setShowRatingModal: Dispatch<SetStateAction<boolean>>;
  shareJob: () => Promise<void>;
  showApplicationModal: boolean;
  showConfirmModal: boolean;
  showImageModal: boolean;
  showInstagramComments: boolean;
  showRatingModal: boolean;
};

export type JobDetailsAbortRefs = {
  fetchApplicationsAbortRef: MutableRefObject<AbortController | null>;
  fetchCommentsAbortRef: MutableRefObject<AbortController | null>;
  fetchJobAbortRef: MutableRefObject<AbortController | null>;
  trackViewAbortRef: MutableRefObject<AbortController | null>;
};
