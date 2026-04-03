import type { MouseEvent as ReactMouseEvent, SyntheticEvent } from 'react';

import type { ExtendedUserPlan, JobDetails } from './page.types';

export type RatingCategories = {
  communication: number;
  quality: number;
  timeliness: number;
  professionalism: number;
};

export type RatingFormData = {
  rating: number;
  review: string;
  categories: RatingCategories;
};

export type BudgetBreakdown = {
  enabled: boolean;
  laborCost: string;
  materialsCost: string;
  serviceFee: string;
};

export type TimeEstimateForm = {
  value: string;
  unit: string;
};

export type MaterialListItemForm = {
  item?: string;
  quantity?: string | number;
  estimatedCost?: string | number;
};

export type JobApplicationFormData = {
  proposedAmount: string;
  budgetBreakdown: BudgetBreakdown;
  timeEstimate: TimeEstimateForm;
  materialsList: MaterialListItemForm[];
  coverLetter: string;
  workPlan: string;
  materialsIncluded: boolean;
  requirements: string;
  specialNotes: string;
};

type UserLike = {
  role?: string;
  plan?: ExtendedUserPlan;
};

type JobLike = Pick<JobDetails, 'hasApplied'>;

export const createInitialRatingData = (): RatingFormData => ({
  rating: 0,
  review: '',
  categories: {
    communication: 0,
    quality: 0,
    timeliness: 0,
    professionalism: 0,
  },
});

export const createInitialApplicationData = (): JobApplicationFormData => ({
  proposedAmount: '',
  budgetBreakdown: {
    enabled: false,
    laborCost: '',
    materialsCost: '',
    serviceFee: '',
  },
  timeEstimate: { value: '', unit: 'hours' },
  materialsList: [],
  coverLetter: '',
  workPlan: '',
  materialsIncluded: false,
  requirements: '',
  specialNotes: '',
});

export const containsSensitiveInfo = (text: string): boolean => {
  if (!text) return false;

  const phoneRegex =
    /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}|\b\d{10}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|call me|contact me|phone|mobile|whatsapp|wa\.me/gi;
  const emailRegex =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|email|mail me|gmail|yahoo|outlook/gi;
  const addressRegex =
    /address|location|meet me|come to|visit|house number|building|street|road|pin code|pincode|landmark/gi;
  const socialRegex = /instagram|facebook|twitter|telegram|discord|skype|zoom|meet\.google|teams/gi;
  const meetingRegex =
    /meet outside|offline|direct contact|personal meeting|outside app|bypass|direct deal/gi;

  return (
    phoneRegex.test(text) ||
    emailRegex.test(text) ||
    addressRegex.test(text) ||
    socialRegex.test(text) ||
    meetingRegex.test(text)
  );
};

export const canUserComment = (
  user: UserLike | null | undefined,
  job: JobLike | null | undefined
): boolean => {
  if (!user) return false;

  if (user.role === 'hirer') {
    return true;
  }

  if (user.role === 'fixer') {
    if (user.plan?.type === 'pro' && user.plan?.status === 'active') {
      return true;
    }

    const applicationsUsed = user.plan?.creditsUsed || 0;
    const hasCredits = applicationsUsed < 3;
    const hasAppliedToJob = Boolean(job?.hasApplied);

    return hasCredits || hasAppliedToJob;
  }

  return false;
};

export const getTimeAgo = (timestamp: string | number | Date | null | undefined): string => {
  if (!timestamp) {
    return '0s';
  }

  const now = new Date();
  const time = new Date(timestamp);
  const timeMs = time.getTime();
  if (!Number.isFinite(timeMs)) {
    return '0s';
  }

  const diffInSeconds = Math.floor((now.getTime() - timeMs) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return time.toLocaleDateString();
};

export const getUrgencyColor = (urgency?: string): string => {
  switch (urgency) {
    case 'asap':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'flexible':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'scheduled':
      return 'text-fixly-primary bg-fixly-accent/10 border-fixly-accent/30';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getTimeRemaining = (deadline: string | number | Date | null | undefined): string => {
  if (!deadline) {
    return 'Not set';
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const deadlineMs = deadlineDate.getTime();
  if (!Number.isFinite(deadlineMs)) {
    return 'Not set';
  }

  const diff = deadlineMs - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

export const toValidDate = (value?: string | Date): Date | null => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateValue = (
  value?: string | Date,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = toValidDate(value);
  if (!date) return 'Not specified';
  return date.toLocaleDateString(locale, options);
};

export const formatExperienceLevel = (experienceLevel?: string): string => {
  if (!experienceLevel) {
    return 'Not specified';
  }

  return `${experienceLevel.charAt(0).toUpperCase()}${experienceLevel.slice(1)}`;
};

export const handleAttachmentVideoClick = (event: ReactMouseEvent<HTMLVideoElement>): void => {
  const video = event.currentTarget;
  const playButton = video.parentElement?.querySelector<HTMLElement>('.play-button');

  if (video.paused) {
    void video.play();
    video.controls = true;
    if (playButton) playButton.style.display = 'none';
    return;
  }

  video.pause();
  video.controls = false;
  if (playButton) playButton.style.display = 'flex';
};

export const handleAttachmentVideoEnded = (event: SyntheticEvent<HTMLVideoElement>): void => {
  const video = event.currentTarget;
  const playButton = video.parentElement?.querySelector<HTMLElement>('.play-button');
  video.controls = false;
  if (playButton) playButton.style.display = 'flex';
};
