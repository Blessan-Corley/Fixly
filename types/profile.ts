import type { ReactNode } from 'react';
import type { ContentViolation } from '../lib/validations/content-validator';

type AppUserLike = {
  id?: string;
  image?: string;
  photoURL?: string;
  picture?: string;
  [key: string]: unknown;
};

export type UserRole = 'hirer' | 'fixer' | 'admin';

export type ProfilePhotoRecord = {
  url?: string;
  lastUpdated?: string | number | Date;
  nextUpdateDate?: string | number | Date;
};

export type UserRating = {
  average?: number;
  count?: number;
};

export type UserPlan = {
  type?: string;
};

export type UserLocationCoordinates = {
  latitude?: number;
  longitude?: number;
};

export type UserHomeAddress = {
  city?: string;
  district?: string;
  formattedAddress?: string;
  coordinates?: UserLocationCoordinates;
};

export type ProfileLocation = {
  name?: string;
  city?: string;
  state?: string;
  address?: string;
  lat?: number;
  lng?: number;
  homeAddress?: UserHomeAddress;
  accuracy?: number;
  timestamp?: string | number | Date;
};

export type LocationHistoryItem = {
  city?: string;
  address?: string;
  timestamp?: string | number | Date;
};

export type UserPreferences = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  jobAlerts: boolean;
  marketingEmails: boolean;
};

export type ProfileUser = AppUserLike & {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  bio?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string | number | Date;
  profilePhoto?: ProfilePhotoRecord;
  rating?: UserRating;
  jobsCompleted?: number;
  plan?: UserPlan;
  skills?: string[];
  availableNow?: boolean;
  serviceRadius?: number;
  preferences?: Partial<UserPreferences>;
  location?: ProfileLocation | null;
  locationHistory?: LocationHistoryItem[];
};

export type CityResult = {
  name: string;
  state: string;
  lat: number;
  lng: number;
};

export type NameInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export type BioInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export type BioValidationState = {
  isValid: boolean;
  violations: ContentViolation[];
};

export type ProfileSectionProps = {
  title: string;
  children: ReactNode;
  editable?: boolean;
  editing?: boolean;
  onEdit?: () => void;
};

export type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordVisibility = {
  current: boolean;
  new: boolean;
  confirm: boolean;
};

export type PasswordValidationRequirements = {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export type PasswordValidationResult = {
  isValid: boolean;
  requirements: PasswordValidationRequirements;
};

export type PhoneVerificationResult = {
  user?: Partial<ProfileUser>;
  message?: string;
};

export type EmailAvailabilityResponse = {
  available: boolean;
  message?: string;
};
