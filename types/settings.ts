import type { ComponentType } from 'react';

export type AppUserLike = {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  username?: string;
  [key: string]: unknown;
};

export type BadgeStyle = 'dots' | 'numbers';
export type OtpType = 'username' | 'email' | '';
export type SettingsSectionId =
  | 'profile'
  | 'verification'
  | 'notifications'
  | 'appearance'
  | 'language'
  | 'billing';
export type VerificationStatus = 'pending' | 'rejected' | 'approved' | 'unverified';

export type SettingsVerification = {
  status?: VerificationStatus;
  lastApplicationDate?: string;
  rejectionReason?: string;
};

export type SettingsUser = AppUserLike & {
  bio?: string;
  usernameChangeCount?: number;
  isVerified?: boolean;
  plan?: {
    type?: string;
  };
  verification?: SettingsVerification;
  preferences?: Record<string, boolean | undefined>;
};

export type VerificationFormData = {
  documentType: string;
  documentFiles: File[];
  additionalInfo: string;
};

export type SettingSection = {
  id: SettingsSectionId;
  title: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
};

export type VerificationDocumentOption = {
  value: string;
  label: string;
  icon: string;
};
