export type BudgetType = 'fixed' | 'hourly' | 'negotiable';
export type JobUrgency = 'asap' | 'flexible' | 'scheduled';
export type JobType = 'one-time' | 'recurring';
export type DraftStatus = 'unsaved' | 'saving' | 'saved' | 'error';
export type SaveDraftType = 'auto' | 'manual' | 'step_change';
export type ValidationField = 'title' | 'description';
export type ErrorField =
  | 'title'
  | 'description'
  | 'skillsRequired'
  | 'budget.type'
  | 'budget.amount'
  | 'location.address'
  | 'location.city'
  | 'location.pincode'
  | 'deadline'
  | 'scheduledDate'
  | 'urgency'
  | 'attachments';

export type JobBudget = {
  type: BudgetType;
  amount: string;
  materialsIncluded: boolean;
};

export type JobLocation = {
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  _original?: unknown;
};

export type JobAttachment = {
  id: string;
  name: string;
  filename?: string;
  type: string;
  size: number;
  url: string;
  publicId?: string;
  isImage: boolean;
  isVideo: boolean;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  createdAt?: string;
};

export type PostJobFormData = {
  title: string;
  description: string;
  skillsRequired: string[];
  budget: JobBudget;
  location: JobLocation;
  deadline: string;
  urgency: JobUrgency;
  type: JobType;
  scheduledDate: string;
  attachments: JobAttachment[];
};

export type FormErrors = Partial<Record<ErrorField, string>>;
export type ValidationMessages = Partial<Record<ValidationField, string>>;
export type FieldValidations = Partial<Record<ValidationField, boolean | null>>;
export type UploadProgressMap = Record<string, number>;

export type SubscriptionInfo = {
  plan: {
    type: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
    daysRemaining: number | null;
    features: string[];
  };
  eligibility: {
    canPostJobs: boolean;
    jobPostsRemaining: number | null;
    maxActiveJobs: number;
    canBoostJobs: boolean;
  };
};

export type DraftSummary = {
  _id: string;
  title?: string;
  description?: string;
  currentStep?: number;
  completionPercentage?: number;
  ageInHours?: number;
  photoCount?: number;
  videoCount?: number;
  lastAutoSave?: string;
  lastManualSave?: string;
  skillsRequired?: string[];
  budget?: Partial<JobBudget>;
  type?: JobType;
  location?: Partial<JobLocation>;
  deadline?: string;
  urgency?: JobUrgency;
  scheduledDate?: string;
  attachments?: JobAttachment[];
};

export type ContentViolation = {
  type: string;
};

export type ContentValidationResponse = {
  isValid?: boolean;
  violations?: ContentViolation[];
  message?: string;
};

export type SubscriptionApiResponse = SubscriptionInfo;
export type DraftsListResponse = { drafts?: DraftSummary[] };
export type DraftSaveResponse = { draft: DraftSummary };
export type DraftLoadResponse = { draft: DraftSummary };

export type UploadMediaResponse = {
  success?: boolean;
  message?: string;
  media?: {
    id: string;
    filename: string;
    type: string;
    size: number;
    url: string;
    publicId?: string;
    isImage: boolean;
    isVideo: boolean;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    createdAt?: string;
  };
};

export type PostJobResponse = {
  success?: boolean;
  message?: string;
  violations?: ContentViolation[];
};

export type FormFieldMap = {
  title: string;
  description: string;
  skillsRequired: string[];
  'budget.type': BudgetType;
  'budget.amount': string;
  'budget.materialsIncluded': boolean;
  location: JobLocation;
  deadline: string;
  urgency: JobUrgency;
  type: JobType;
  scheduledDate: string;
  attachments: JobAttachment[];
};

export type FormField = keyof FormFieldMap;
