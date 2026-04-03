import type { ComponentType } from 'react';

export type VerificationPromptVariant = 'banner' | 'card';

export interface VerificationUser {
  email?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface VerificationItem {
  type: 'email' | 'phone';
  label: string;
  verified: boolean;
  icon: ComponentType<{ className?: string }>;
  value?: string | null;
}
