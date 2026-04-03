export type EvidenceItem = {
  id: string;
  type: 'image' | 'document';
  url: string;
  filename: string;
  description: string;
};

export type DisputeFormData = {
  category: string;
  subcategory: string;
  title: string;
  description: string;
  desiredOutcome: string;
  desiredOutcomeDetails: string;
  disputedAmount: string;
  refundRequested: string;
  additionalPaymentRequested: string;
  evidence: EvidenceItem[];
};

export type JobParty = {
  id: string;
  name: string;
  username: string;
  photoURL: string | null;
};

export type JobDetails = {
  id: string;
  title: string;
  category: string;
  status: string;
  budgetAmount: number;
  locationAddress: string;
  client: JobParty | null;
  fixer: JobParty | null;
};

export type JobApiPayload = {
  success?: unknown;
  job?: unknown;
  message?: unknown;
};

export type DisputeApiPayload = {
  success?: unknown;
  dispute?: unknown;
  message?: unknown;
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const INITIAL_FORM_DATA: DisputeFormData = {
  category: '',
  subcategory: '',
  title: '',
  description: '',
  desiredOutcome: '',
  desiredOutcomeDetails: '',
  disputedAmount: '',
  refundRequested: '',
  additionalPaymentRequested: '',
  evidence: [],
};

export const DISPUTE_CATEGORIES = [
  {
    value: 'payment_issue',
    label: 'Payment Issue',
    description: 'Problems with payment processing or amounts',
  },
  {
    value: 'work_quality',
    label: 'Work Quality',
    description: 'Issues with the quality of work delivered',
  },
  {
    value: 'communication_problem',
    label: 'Communication Problem',
    description: 'Poor or lack of communication',
  },
  {
    value: 'scope_disagreement',
    label: 'Scope Disagreement',
    description: 'Disagreement about project scope',
  },
  {
    value: 'timeline_issue',
    label: 'Timeline Issue',
    description: 'Delays or timeline disagreements',
  },
  {
    value: 'unprofessional_behavior',
    label: 'Unprofessional Behavior',
    description: 'Inappropriate conduct',
  },
  {
    value: 'contract_violation',
    label: 'Contract Violation',
    description: 'Violation of agreed terms',
  },
  {
    value: 'safety_concern',
    label: 'Safety Concern',
    description: 'Safety issues or violations',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other issues not listed above',
  },
] as const;

export const DESIRED_OUTCOMES = [
  {
    value: 'refund',
    label: 'Full Refund',
    description: 'Request a complete refund of payment',
  },
  {
    value: 'partial_refund',
    label: 'Partial Refund',
    description: 'Request a partial refund',
  },
  {
    value: 'work_completion',
    label: 'Work Completion',
    description: 'Request work to be completed as agreed',
  },
  {
    value: 'work_revision',
    label: 'Work Revision',
    description: 'Request work to be revised or corrected',
  },
  {
    value: 'additional_payment',
    label: 'Additional Payment',
    description: 'Request additional payment for extra work',
  },
  {
    value: 'mediation',
    label: 'Mediation',
    description: 'Request mediation to resolve the issue',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other resolution not listed above',
  },
] as const;
