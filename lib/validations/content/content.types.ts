export const ValidationSeverity = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

export const ViolationType = {
  PHONE_NUMBER: 'phone_number',
  EMAIL_ADDRESS: 'email_address',
  SOCIAL_MEDIA: 'social_media',
  LOCATION_SHARING: 'location_sharing',
  EXTERNAL_LINK: 'external_link',
  PROFANITY: 'profanity',
  ABUSE: 'abuse',
  SPAM: 'spam',
  PROMOTIONAL: 'promotional',
  REPETITIVE: 'repetitive',
} as const;

export type ValidationSeverityValue = (typeof ValidationSeverity)[keyof typeof ValidationSeverity];
export type ViolationTypeValue = (typeof ViolationType)[keyof typeof ViolationType];

export type ValidationContext =
  | 'general'
  | 'job_posting'
  | 'job_draft'
  | 'job_description'
  | 'job_application'
  | 'comment'
  | 'review'
  | 'dispute'
  | 'portfolio'
  | 'job_media'
  | 'notification'
  | 'profile'
  | 'private_message'
  | string;

export type PatternRule = {
  pattern: RegExp;
  severity: ValidationSeverityValue;
  message: string;
};

export type ContentViolation = {
  type: ViolationTypeValue;
  severity: ValidationSeverityValue;
  message: string;
  match: string;
  position: number;
  suggestion?: string;
};

export type ContentValidationResult = {
  isValid: boolean;
  violations: ContentViolation[];
  score: number;
  cleanedContent: string;
  suggestions: string[];
};

export type ViolationLogEntry = {
  content: string;
  violations: Array<Pick<ContentViolation, 'type' | 'severity' | 'message'>>;
  timestamp: number;
};

export type ViolationSummary = {
  count: number;
  lastViolationAt: number;
  recentTypes: ViolationTypeValue[];
};

export type SkillInput = string | { name?: string };

export type ValidationPolicy = {
  allowSensitiveInfo: boolean;
  blockHighSeverity: boolean;
  blockedTypes: Set<ViolationTypeValue>;
};

export const CACHE_LIMIT = 1000;
export const BLOCK_SCORE_THRESHOLD = 10;
export const VIOLATION_LOG_TTL_SECONDS = 30 * 24 * 60 * 60;
export const VIOLATION_SUMMARY_TTL_SECONDS = 90 * 24 * 60 * 60;
