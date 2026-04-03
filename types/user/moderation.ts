import type { Types } from 'mongoose';

import type { VerificationStatus } from './primitives';

export interface UserVerificationDocument {
  originalName: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface UserVerification {
  status: VerificationStatus;
  documentType?: string;
  documents?: UserVerificationDocument[];
  additionalInfo?: string;
  submittedAt?: Date;
  lastApplicationDate?: Date;
  applicationId?: string;
  rejectionReason?: string;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId | string;
  otp?: {
    code?: string;
    expiresAt?: Date;
    attempts?: number;
    lastSentAt?: Date;
    purpose?: string;
  };
}

export interface UserBanDetails {
  reason?: string;
  description?: string;
  type?: 'temporary' | 'permanent';
  duration?: number;
  bannedAt?: Date;
  expiresAt?: Date;
  bannedBy?: Types.ObjectId | string;
  previousBans?: Array<Record<string, unknown>>;
  warnings?: Array<Record<string, unknown>>;
  appealed?: boolean;
  appeal?: {
    message?: string;
    evidence?: string[];
    submittedAt?: Date;
    status?: 'pending' | 'approved' | 'rejected';
    reviewedAt?: Date;
    reviewedBy?: Types.ObjectId | string;
    reviewNotes?: string;
  };
}
