export const ADMIN_EMAIL = 'blessancorley@gmail.com';
export const ADMIN_WHATSAPP = '919976768211';

export type AdminNotificationEvent =
  | 'CONTACT_FORM_SUBMISSION'
  | 'NEW_USER_REGISTRATION'
  | 'JOB_POSTED'
  | 'PAYMENT_ISSUE'
  | 'DISPUTE_CREATED'
  | 'SYSTEM_ERROR';

export type ContactFormSubmissionData = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  subject?: string | null;
  message?: string | null;
};

export type NewUserRegistrationData = {
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  userLocation?: string | null;
};

export type JobPostedData = {
  jobTitle?: string | null;
  hirerName?: string | null;
  budget?: string | number | null;
  location?: string | null;
  urgency?: string | null;
};

export type PaymentIssueData = {
  userId?: string | null;
  amount?: string | number | null;
  error?: string | null;
  transactionId?: string | null;
};

export type DisputeCreatedData = {
  jobTitle?: string | null;
  disputeReason?: string | null;
  involvedUsers?: string[];
};

export type SystemErrorData = {
  error?: string | null;
  endpoint?: string | null;
  userId?: string | null;
  severity?: string | null;
};

export function getSafeText(value: unknown, fallback = 'Not provided'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function getSafeNumberText(value: unknown, fallback = 'Not provided'): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

export function toHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
}
