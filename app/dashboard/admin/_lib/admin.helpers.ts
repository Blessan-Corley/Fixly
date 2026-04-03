import {
  Activity,
  Briefcase,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

import type {
  AdminJob,
  AdminStats,
  AdminTabConfig,
  AdminUser,
  EnvHealthVariable,
  UserRole,
  VerificationApplication,
  VerificationDocument,
  VerificationStatus,
} from '@/app/dashboard/admin/_lib/admin.types';

export const TABS: AdminTabConfig[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'verification', label: 'Verification', icon: Shield },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function toNumberSafe(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function toBooleanSafe(value: unknown): boolean {
  return value === true;
}

export function toUserRole(value: unknown): UserRole {
  if (value === 'hirer' || value === 'fixer' || value === 'admin') {
    return value;
  }
  return 'hirer';
}

export function toVerificationStatus(value: unknown): VerificationStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
    return value;
  }
  return 'pending';
}

export function toId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (isRecord(value)) {
    const id = value._id;
    if (typeof id === 'string') return id;
    if (typeof value.toString === 'function') {
      const candidate = value.toString();
      if (candidate && candidate !== '[object Object]') {
        return candidate;
      }
    }
  }
  return '';
}

export function normalizeStats(payload: unknown): AdminStats {
  const root = isRecord(payload) ? payload : {};
  const users = isRecord(root.users) ? root.users : {};
  const jobs = isRecord(root.jobs) ? root.jobs : {};
  const disputes = isRecord(root.disputes) ? root.disputes : {};
  const applications = isRecord(root.applications) ? root.applications : {};
  const revenue = isRecord(root.revenue) ? root.revenue : {};
  const platform = isRecord(root.platform) ? root.platform : {};

  return {
    totalUsers: toNumberSafe(users.total, toNumberSafe(root.totalUsers)),
    totalJobs: toNumberSafe(jobs.total, toNumberSafe(root.totalJobs)),
    totalDisputes: toNumberSafe(disputes.total, toNumberSafe(root.totalDisputes)),
    activeJobs: toNumberSafe(jobs.active, toNumberSafe(root.activeJobs)),
    completedJobs: toNumberSafe(jobs.completed, toNumberSafe(root.completedJobs)),
    totalApplications: toNumberSafe(applications.total),
    activeSubscriptions: toNumberSafe(revenue.subscriptionsActive),
    estimatedRevenue: toNumberSafe(revenue.totalEstimated),
    lastUpdated: toStringSafe(platform.lastUpdated),
  };
}

export function normalizeEnvHealthVariables(payload: unknown): EnvHealthVariable[] {
  const root = isRecord(payload) ? payload : {};
  const health = isRecord(root.health) ? root.health : {};
  const variables = Array.isArray(health.variables) ? health.variables : [];

  return variables
    .map((entry): EnvHealthVariable => {
      const source = isRecord(entry) ? entry : {};
      const scope: EnvHealthVariable['scope'] = source.scope === 'client' ? 'client' : 'server';
      const status: EnvHealthVariable['status'] =
        source.status === 'present' ? 'present' : 'missing';

      return {
        name: toStringSafe(source.name),
        scope,
        status,
      };
    })
    .filter((entry) => entry.name.length > 0);
}

export function normalizeUser(payload: unknown): AdminUser {
  const source = isRecord(payload) ? payload : {};
  return {
    _id: toId(source._id),
    name: toStringSafe(source.name, 'Unknown user'),
    email: toStringSafe(source.email, ''),
    username: toStringSafe(source.username, ''),
    role: toUserRole(source.role),
    banned: toBooleanSafe(source.banned),
    createdAt: toStringSafe(source.createdAt, ''),
    profilePhoto: toStringSafe(source.profilePhoto, '/default-avatar.png'),
  };
}

export function normalizeJob(payload: unknown): AdminJob {
  const source = isRecord(payload) ? payload : {};
  const location = isRecord(source.location) ? source.location : {};
  const budget = isRecord(source.budget) ? source.budget : {};
  const createdBy = isRecord(source.createdBy) ? source.createdBy : {};

  return {
    _id: toId(source._id),
    title: toStringSafe(source.title, 'Untitled job'),
    status: toStringSafe(source.status, 'unknown'),
    applicationCount: toNumberSafe(source.applicationCount),
    createdAt: toStringSafe(source.createdAt, ''),
    location: {
      city: toStringSafe(location.city, ''),
      state: toStringSafe(location.state, ''),
    },
    budget: {
      type: toStringSafe(budget.type, ''),
      amount: budget.amount == null ? null : toNumberSafe(budget.amount, 0),
    },
    createdBy: {
      name: toStringSafe(createdBy.name, 'Unknown'),
    },
  };
}

export function normalizeVerificationDocument(payload: unknown): VerificationDocument {
  const source = isRecord(payload) ? payload : {};
  return {
    originalName: toStringSafe(source.originalName, 'Document'),
    fileSize: toNumberSafe(source.fileSize, 0),
    fileType: toStringSafe(source.fileType, ''),
    cloudinaryUrl: toStringSafe(source.cloudinaryUrl, ''),
  };
}

export function normalizeVerificationApplication(payload: unknown): VerificationApplication {
  const source = isRecord(payload) ? payload : {};
  const documentsRaw = Array.isArray(source.documents) ? source.documents : [];
  return {
    id: toId(source.id),
    applicationId: toStringSafe(source.applicationId, ''),
    userName: toStringSafe(source.userName, 'Unknown applicant'),
    userEmail: toStringSafe(source.userEmail, ''),
    userPhone: toStringSafe(source.userPhone, ''),
    documentType: toStringSafe(source.documentType, ''),
    status: toVerificationStatus(source.status),
    submittedAt: toStringSafe(source.submittedAt, ''),
    additionalInfo: toStringSafe(source.additionalInfo, ''),
    documents: documentsRaw.map(normalizeVerificationDocument),
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

export function formatDate(value: string, includeTime = false): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }
  return includeTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
}
