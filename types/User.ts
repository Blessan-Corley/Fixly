import { Document, Types } from 'mongoose';

import type { UserLocation, UserLocationHistoryEntry } from './user/location';
import type { UserBanDetails, UserVerification } from './user/moderation';
import type { UserPlan, UserPortfolioItem } from './user/plan';
import type { UserPreferences, UserPrivacy } from './user/preferences';
import type { AuthMethod, BadgeType, UserRole } from './user/primitives';
import type { UserNotification, UserRating } from './user/activity';

export type { UserRole, AuthMethod, PlanType, PlanStatus, BadgeType, VerificationStatus } from './user/primitives';
export type { LocationCoordinates, LocationAddress, UserLocation, UserLocationHistoryEntry } from './user/location';
export type { UserPlan, UserPortfolioItem } from './user/plan';
export type { UserVerificationDocument, UserVerification, UserBanDetails } from './user/moderation';
export type { UserPrivacy, UserPreferences } from './user/preferences';
export type { UserNotification, RatingCategory, UserRating } from './user/activity';

export interface IUser extends Document {
  _id: Types.ObjectId;
  uid?: string;
  googleId?: string;
  firebaseUid?: string;
  name: string;
  username: string;
  usernameChangeCount: number;
  lastUsernameChange?: Date;
  email: string;
  phone?: string;
  passwordHash?: string;
  authMethod: AuthMethod;
  providers: AuthMethod[];
  role: UserRole;
  isRegistered: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  banned: boolean;
  banDetails?: UserBanDetails;
  location?: UserLocation;
  locationHistory?: UserLocationHistoryEntry[];
  lastLocationUpdate?: Date;
  profilePhoto?: {
    url: string | null;
    cloudinaryPublicId?: string;
    lastUpdated?: Date;
    originalName?: string;
    fileSize?: number;
    dimensions?: { width: number; height: number };
  };
  picture?: string;
  bio?: string;
  website?: string;
  experience?: string;

  // Fixer specific
  skills?: string[];
  availableNow?: boolean;
  serviceRadius?: number;
  hourlyRate?: number | null;
  minimumJobValue?: number | null;
  maximumJobValue?: number | null;
  responseTime?: string;
  workingHours?: { start: string; end: string };
  workingDays?: string[];
  autoApply?: boolean;
  emergencyAvailable?: boolean;
  portfolio?: UserPortfolioItem[];
  savedJobs?: Array<Types.ObjectId | string>;
  verification?: UserVerification;
  verifiedAt?: Date;
  suspended?: boolean;
  suspendedAt?: Date;
  suspendedReason?: string;

  privacy: UserPrivacy;
  preferences: UserPreferences;
  plan: UserPlan;
  pendingOrder?: {
    orderId?: string;
    sessionId?: string;
    amount?: number;
    plan?: string;
    planId?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt?: Date;
  };

  // Stats
  lastJobPostedAt?: Date;
  jobsPosted: number;
  jobsCompleted: number;
  totalEarnings: number;
  rating: UserRating;
  badges: BadgeType[];
  notifications: UserNotification[];

  deletedAt?: Date;
  isActive: boolean;

  lastLoginAt?: Date;
  lastActivityAt?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  profileCompletedAt?: Date;

  registrationMetadata?: {
    deviceInfo: {
      type: string;
      os: string;
      browser: string;
      userAgent: string;
    };
    ip: string;
    timestamp: Date;
    source: string;
  };
  createdAt?: Date;
  updatedAt?: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  canPostJob(): boolean;
  getNextJobPostTime(): Date | null;
  canApplyToJob(): boolean;
  canBeAssignedJob(): boolean;
  addNotification(
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<IUser>;
  banUser(
    adminId: Types.ObjectId,
    reason: string,
    description: string,
    type?: 'temporary' | 'permanent',
    duration?: number
  ): Promise<IUser>;
  unbanUser(adminId: Types.ObjectId, reason?: string): Promise<IUser>;
  isBanExpired(): boolean;
  getBanTimeRemaining(): string | null;
  issueWarning(adminId: Types.ObjectId, reason: string, description: string): Promise<IUser>;
  submitBanAppeal(message: string, evidence?: string[]): Promise<IUser>;
  updateRating(newRating: number): Promise<IUser>;
  linkGoogleAccount(googleId: string, picture?: string): Promise<IUser>;
  updateBadges(): Promise<IUser>;
}
