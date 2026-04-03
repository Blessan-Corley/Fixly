import type { ProfileLocation, ProfilePhotoRecord, ProfileUser, UserPreferences } from './profile';

export type ApiSuccessMessageResponse = {
  success: boolean;
  message?: string;
};

export type SendPasswordResetOtpRequest = {
  email?: string;
  type: 'password_reset';
};

export type ChangePasswordWithOtpRequest = {
  currentPassword: string;
  newPassword: string;
  otp: string;
  email?: string;
};

export type UpdateProfileRequest = {
  name: string;
  bio: string;
  location: ProfileLocation | null;
  skills: string[];
  availableNow: boolean;
  serviceRadius: number;
  preferences: UserPreferences;
};

export type UpdateProfileResponse = {
  ok: boolean;
  user?: Partial<ProfileUser>;
  message?: string;
  rateLimited?: boolean;
};

export type ProfilePhotoUploadSuccess = {
  ok: true;
  profilePhoto: ProfilePhotoRecord;
  message?: string;
};

export type ProfilePhotoUploadError = {
  ok: false;
  status: number;
  message?: string;
  daysRemaining?: number;
};

export type ProfilePhotoUploadResponse = ProfilePhotoUploadSuccess | ProfilePhotoUploadError;

export type CheckEmailAvailabilityResponse = {
  available: boolean;
  message?: string;
};

export type SendEmailChangeOtpRequest = {
  newEmail: string;
  step: 'send_otp';
};

export type VerifyEmailChangeRequest = {
  newEmail: string;
  otp: string;
  step: 'verify_and_change';
};

export type UpdatePhoneNumberRequest = {
  phoneNumber: string;
};
