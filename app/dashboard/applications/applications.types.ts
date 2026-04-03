import type { LucideIcon } from 'lucide-react';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | string;

export type ApplicationTimeEstimate = {
  value: number;
  unit: string;
};

export type CreatedBySummary = {
  name: string;
  photoURL: string;
  rating: {
    average?: number;
  };
};

export type ApplicationJob = {
  _id: string;
  title: string;
  description: string;
  featured: boolean;
  location: {
    city: string;
  };
  createdBy: CreatedBySummary;
};

export type ApplicationItem = {
  _id: string;
  status: ApplicationStatus;
  proposedAmount?: number;
  appliedAt: string;
  timeEstimate?: ApplicationTimeEstimate;
  coverLetter?: string;
  job: ApplicationJob;
};

export type FilterState = {
  status: string;
  search: string;
};

export type EarningsSummary = {
  total: number;
  thisMonth: number;
  completedJobs: number;
};

export type StatCard = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  containerClass: string;
  iconClass: string;
};
