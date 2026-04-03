export type JobFilters = {
  city?: string;
  state?: string;
  skills?: string[];
  budget?: {
    min?: number;
    max?: number;
  };
  urgency?: string;
  type?: string;
  experienceLevel?: string;
  budgetType?: string;
  sortBy?: 'newest' | 'deadline' | 'budget_high' | 'budget_low' | 'popular';
};

export type JobUserRole = 'created' | 'assigned';
