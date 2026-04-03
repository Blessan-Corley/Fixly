import type { SignupDraft } from '@/lib/signup-draft';

export type IncompleteSignupNotice = {
  hasPendingSession: boolean;
  draft: SignupDraft | null;
};
