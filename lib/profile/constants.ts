import type {
  PasswordData,
  PasswordValidationRequirements,
  PasswordVisibility,
  UserPreferences,
} from '../../types/profile';

export const DEFAULT_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  smsNotifications: true,
  jobAlerts: true,
  marketingEmails: false,
};

export const DEFAULT_PASSWORD_DATA: PasswordData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export const DEFAULT_PASSWORD_VISIBILITY: PasswordVisibility = {
  current: false,
  new: false,
  confirm: false,
};

export const PASSWORD_REQUIREMENT_LABELS: Record<keyof PasswordValidationRequirements, string> = {
  minLength: 'At least 8 characters',
  hasLetter: 'Contains letters',
  hasNumber: 'Contains numbers',
  hasSpecial: 'Contains special characters',
};

export const PREFERENCE_LABELS: Record<keyof UserPreferences, string> = {
  emailNotifications: 'Email Notifications',
  smsNotifications: 'SMS Notifications',
  jobAlerts: 'Job Alerts',
  marketingEmails: 'Marketing Emails',
};
