import type React from 'react';

export type DisputeStatus =
  | 'pending'
  | 'under_review'
  | 'awaiting_response'
  | 'in_mediation'
  | 'resolved'
  | 'escalated'
  | 'closed'
  | 'cancelled';

export type DisputeCategory =
  | 'payment_issue'
  | 'work_quality'
  | 'communication_problem'
  | 'scope_disagreement'
  | 'timeline_issue'
  | 'unprofessional_behavior'
  | 'safety_concern'
  | 'other';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';
export type UserRole = 'hirer' | 'fixer' | 'admin' | 'moderator';

export type DisputeParty = {
  _id: string;
  name: string;
  photoURL?: string;
};

export type DisputeAmount = {
  disputedAmount?: number;
  refundRequested?: number;
  additionalPaymentRequested?: number;
};

export type DisputeMetadata = {
  totalMessages: number;
};

export type DisputeJob = {
  title: string;
};

export type DisputeRecord = {
  _id: string;
  disputeId: string;
  title: string;
  status: DisputeStatus;
  priority: DisputePriority;
  category: DisputeCategory;
  initiatedBy: DisputeParty;
  againstUser: DisputeParty;
  createdAt: string;
  amount?: DisputeAmount;
  job?: DisputeJob;
  metadata: DisputeMetadata;
};

export type DisputeStatistics = {
  total: number;
  pending: number;
  underReview: number;
  inMediation: number;
  resolved: number;
};

export type DisputeFilters = {
  status: DisputeStatus | 'all';
  category: DisputeCategory | 'all';
  sortBy: 'createdAt' | 'status' | 'priority' | 'category';
  search: string;
};

export type PaginationState = {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
};

export type SessionUser = {
  id?: string;
  role?: UserRole;
};

export type DisputesApiPayload = {
  success?: boolean;
  message?: string;
  disputes?: unknown[];
  statistics?: unknown;
  pagination?: unknown;
};

export type StatCard = {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  cardClass: string;
  iconClass: string;
};

export const DEFAULT_FILTERS: DisputeFilters = {
  status: 'all',
  category: 'all',
  sortBy: 'createdAt',
  search: '',
};

export const DEFAULT_PAGINATION: PaginationState = {
  currentPage: 1,
  totalPages: 1,
  hasMore: false,
};

export const DEFAULT_STATISTICS: DisputeStatistics = {
  total: 0,
  pending: 0,
  underReview: 0,
  inMediation: 0,
  resolved: 0,
};
