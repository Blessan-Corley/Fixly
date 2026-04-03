import type { LucideIcon } from 'lucide-react';

export type AdminTab = 'overview' | 'users' | 'jobs' | 'verification' | 'reports';
export type UserRole = 'hirer' | 'fixer' | 'admin';
export type UserFilter = 'all' | UserRole | 'banned';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type VerificationAction = 'approve' | 'reject';
export type UserAction = 'view' | 'ban' | 'unban';

export interface AdminStats {
  totalUsers: number;
  totalJobs: number;
  totalDisputes: number;
  activeJobs: number;
  completedJobs: number;
  totalApplications: number;
  activeSubscriptions: number;
  estimatedRevenue: number;
  lastUpdated: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  banned: boolean;
  createdAt: string;
  profilePhoto: string;
}

export interface AdminJobLocation {
  city: string;
  state: string;
}

export interface AdminJobBudget {
  type: string;
  amount: number | null;
}

export interface AdminJob {
  _id: string;
  title: string;
  status: string;
  applicationCount: number;
  createdAt: string;
  location: AdminJobLocation;
  budget: AdminJobBudget;
  createdBy: {
    name: string;
  };
}

export interface VerificationDocument {
  originalName: string;
  fileSize: number;
  fileType: string;
  cloudinaryUrl: string;
}

export interface VerificationApplication {
  id: string;
  applicationId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  documentType: string;
  status: VerificationStatus;
  submittedAt: string;
  additionalInfo: string;
  documents: VerificationDocument[];
}

export interface EnvHealthVariable {
  name: string;
  scope: 'server' | 'client';
  status: 'present' | 'missing';
}

export type AdminTabConfig = {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
};
