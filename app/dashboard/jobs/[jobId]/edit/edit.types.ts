export type BudgetType = 'negotiable' | 'fixed' | 'hourly';
export type UrgencyType = 'asap' | 'flexible' | 'scheduled';
export type JobType = 'one-time' | 'recurring';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';
export type DurationUnit = 'hours' | 'days';

export type JobEditFormData = {
  title: string;
  description: string;
  skillsRequired: string[];
  budget: {
    type: BudgetType;
    amount: string;
    materialsIncluded: boolean;
  };
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    lat: number | null;
    lng: number | null;
  };
  deadline: string;
  urgency: UrgencyType;
  type: JobType;
  experienceLevel: ExperienceLevel;
  scheduledDate: string;
  estimatedDuration: {
    value: string;
    unit: DurationUnit;
  };
};

export type ValidationErrors = Record<string, string>;

export type CitySearchResult = {
  name: string;
  state: string;
  lat: number;
  lng: number;
};

export type SubscriptionInfo = {
  plan?: {
    isActive?: boolean;
  };
  eligibility?: {
    canBoostJobs?: boolean;
  };
};

export type JobRecord = {
  _id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  budget?: {
    type?: BudgetType;
    amount?: number | string;
    materialsIncluded?: boolean;
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat?: number | string | null;
    lng?: number | string | null;
  };
  deadline?: string;
  urgency?: UrgencyType;
  type?: JobType;
  experienceLevel?: ExperienceLevel;
  scheduledDate?: string;
  estimatedDuration?: {
    value?: number | string;
    unit?: DurationUnit;
  };
};

export type JobDetailsResponse = {
  job?: unknown;
  message?: string;
};

export type JobUpdateResponse = {
  message?: string;
};

export const DEFAULT_FORM_DATA: JobEditFormData = {
  title: '',
  description: '',
  skillsRequired: [],
  budget: {
    type: 'negotiable',
    amount: '',
    materialsIncluded: false,
  },
  location: {
    address: '',
    city: '',
    state: '',
    pincode: '',
    lat: null,
    lng: null,
  },
  deadline: '',
  urgency: 'flexible',
  type: 'one-time',
  experienceLevel: 'intermediate',
  scheduledDate: '',
  estimatedDuration: {
    value: '',
    unit: 'hours',
  },
};
