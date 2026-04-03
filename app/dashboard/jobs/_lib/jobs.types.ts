import type { RepostSubmitData } from '@/components/ui/RepostJobModal';

export type JobStatus =
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed'
  | string;
export type TabStatus = 'all' | 'open' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

export type JobBudget = {
  type: string;
  amount: number | null;
};

export type JobLocation = {
  city: string;
};

export type JobCompletion = {
  confirmedAt: string | null;
};

export type JobViews = {
  count: number;
};

export type JobApplication = {
  status: string;
};

export type DashboardJob = {
  _id: string;
  title: string;
  description: string;
  status: JobStatus;
  featured: boolean;
  deadline: string | null;
  createdAt: string;
  skillsRequired: string[];
  applicationCount: number;
  applications: JobApplication[];
  budget: JobBudget;
  location: JobLocation;
  completion: JobCompletion;
  views: JobViews;
  experienceLevel: string;
  urgency: string;
  type: string;
  estimatedDuration: unknown;
  scheduledDate: string | null;
};

export type PaginationState = {
  page: number;
  hasMore: boolean;
  total: number;
  totalPages: number;
  limit: number;
};

export type FilterState = {
  status: TabStatus;
  search: string;
};

export type EarningsState = {
  total: number;
  thisMonth: number;
  completedJobs: number;
};

export type DeleteModalState = {
  isOpen: boolean;
  jobId: string | null;
  loading: boolean;
};

export type RepostModalState = {
  isOpen: boolean;
  job: DashboardJob | null;
  loading: boolean;
};

export type JobsPostPayload = {
  jobs?: unknown;
  pagination?: unknown;
  message?: unknown;
};

export type EarningsPayload = {
  earnings?: unknown;
  message?: unknown;
};

export type JobRealtimePayload = {
  applicationCount?: unknown;
  newStatus?: unknown;
  status?: unknown;
  viewCount?: unknown;
};

export type JobsDashboardController = {
  jobs: DashboardJob[];
  loading: boolean;
  pagination: PaginationState;
  activeTab: TabStatus;
  setActiveTab: (tab: TabStatus) => void;
  filters: FilterState;
  showFilters: boolean;
  setShowFilters: (value: boolean | ((prev: boolean) => boolean)) => void;
  earnings: EarningsState;
  deleteModal: DeleteModalState;
  repostModal: RepostModalState;
  isProUser: boolean;
  jobsPosted: number;
  isOnline: boolean;
  pageLoading: boolean;
  showRefreshMessage: boolean;
  tabCounts: Record<TabStatus, number>;
  activeFilterCount: number;
  handleFilterChange: <K extends keyof FilterState>(field: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  openDeleteModal: (jobId: string) => void;
  closeDeleteModal: () => void;
  handleDeleteJob: () => Promise<void>;
  openRepostModal: (job: DashboardJob) => void;
  closeRepostModal: () => void;
  handleRepostJob: (formData: RepostSubmitData) => Promise<void>;
  loadMore: () => void;
  goToSubscription: () => void;
  goToPostJob: () => void;
  viewJob: (jobId: string) => void;
  editJob: (jobId: string) => void;
};

export const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  hasMore: true,
  total: 0,
  totalPages: 0,
  limit: 10,
};

export const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  search: '',
};

export const DEFAULT_EARNINGS: EarningsState = {
  total: 0,
  thisMonth: 0,
  completedJobs: 0,
};
