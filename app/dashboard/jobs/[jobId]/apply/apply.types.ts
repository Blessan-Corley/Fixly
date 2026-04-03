export type TimeEstimateUnit = 'hours' | 'days' | 'weeks';

export type MaterialItem = {
  item: string;
  quantity: number;
  estimatedCost: number;
};

export type ApplicationFormData = {
  proposedAmount: string;
  timeEstimate: {
    value: string;
    unit: TimeEstimateUnit;
  };
  description: string;
  materialsIncluded: boolean;
  materialsList: MaterialItem[];
  requirements: string;
  specialNotes: string;
};

export type JobBudget = {
  type: string;
  amount: number | null;
  min: number | null;
  max: number | null;
};

export type JobCreator = {
  name: string;
  rating: {
    average: number | null;
    count: number;
  };
};

export type JobApplicationEntry = {
  fixer: string;
};

export type JobDetails = {
  _id: string;
  title: string;
  budget: JobBudget;
  createdBy: JobCreator;
  hasApplied: boolean;
  skillsRequired: string[];
  applications: JobApplicationEntry[];
};

export type JobApiPayload = {
  job?: unknown;
  message?: unknown;
};

export type ApplyApiPayload = {
  message?: unknown;
  needsUpgrade?: unknown;
};

export const DEFAULT_FORM_DATA: ApplicationFormData = {
  proposedAmount: '',
  timeEstimate: { value: '', unit: 'hours' },
  description: '',
  materialsIncluded: false,
  materialsList: [],
  requirements: '',
  specialNotes: '',
};
