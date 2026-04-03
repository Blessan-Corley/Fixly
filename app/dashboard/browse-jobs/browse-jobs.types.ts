export type JobSortBy = 'newest' | 'deadline' | 'budget_high' | 'budget_low' | 'distance';
export type DeadlineFilter = '' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom';

export interface BudgetShape {
  type?: string;
  amount?: number;
  materialsIncluded?: boolean;
}

export interface JobLocationShape {
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
}

export interface JobApplicationShape {
  fixer?: string;
  status?: string;
}

export interface BrowseJob {
  _id: string;
  title?: string;
  description?: string;
  urgency?: string;
  createdAt?: string;
  deadline?: string;
  budget?: BudgetShape;
  location?: JobLocationShape;
  skillsRequired?: string[];
  applications?: JobApplicationShape[];
  views?: {
    count?: number;
  };
  commentCount?: number;
  applicationCount?: number;
  hasApplied?: boolean;
  distance?: number | null;
}

export interface PaginationState {
  page: number;
  hasMore: boolean;
  total: number;
}

export interface BrowseFilters {
  search: string;
  skills: string[];
  location: string;
  budgetMin: string;
  budgetMax: string;
  urgency: string;
  deadline: string;
  deadlineFilter: DeadlineFilter;
  customDeadlineStart: string;
  customDeadlineEnd: string;
  sortBy: JobSortBy;
  maxDistance: number | null;
}

export interface FixerUser {
  role: string;
  banned: boolean;
  planType: string;
  planStatus: string;
  creditsUsed: number;
}

export const DEFAULT_FILTERS: BrowseFilters = {
  search: '',
  skills: [],
  location: '',
  budgetMin: '',
  budgetMax: '',
  urgency: '',
  deadline: '',
  deadlineFilter: '',
  customDeadlineStart: '',
  customDeadlineEnd: '',
  sortBy: 'newest',
  maxDistance: null,
};
