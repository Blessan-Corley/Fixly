export type ViewMode = 'grid' | 'list';

export type SearchFilters = {
  budgetMin: string;
  budgetMax: string;
  budgetType: string;
  urgency: string;
  datePosted: string;
  sortBy: string;
};

export type JobBudget = {
  type?: string;
  amount?: number;
  min?: number;
  max?: number;
};

export type JobLocation = {
  city?: string;
};

export type JobViews = {
  count?: number;
};

export type JobSearchResult = {
  _id: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  createdAt: string;
  skillsRequired: string[];
  location: JobLocation;
  applicationCount: number;
  commentCount: number;
  applications: unknown[];
  views: JobViews;
  budget: JobBudget;
};

export type JobsBrowsePayload = {
  jobs?: unknown;
  total?: unknown;
  pagination?: {
    total?: unknown;
  };
};
