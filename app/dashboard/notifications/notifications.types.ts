import type { Bell } from 'lucide-react';

export type NotificationPriority = 'low' | 'normal' | 'medium' | 'high' | 'urgent';
export type NotificationCategory =
  | 'all'
  | 'unread'
  | 'jobs'
  | 'messages'
  | 'payments'
  | 'system'
  | 'reviews'
  | 'social'
  | 'other';

export type FilterStatus = 'all' | 'read' | 'unread';

export type Filters = {
  type: string;
  status: FilterStatus;
  search: string;
};

export type NotificationRecord = {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  priority: NotificationPriority;
  actionUrl?: string;
  data?: Record<string, unknown>;
};

export type StatCard = {
  label: string;
  value: number;
  icon: typeof Bell;
  style: string;
  iconStyle: string;
};

export type CategoryStats = Record<NotificationCategory, number>;

export const TAB_OPTIONS: Array<{ id: NotificationCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'messages', label: 'Messages' },
  { id: 'payments', label: 'Payments' },
  { id: 'system', label: 'System' },
];

export const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'job_application', label: 'Job Applications' },
  { value: 'job_status_update', label: 'Job Status Updates' },
  { value: 'job_completed', label: 'Job Completed' },
  { value: 'new_message', label: 'Messages' },
  { value: 'payment_success', label: 'Payments' },
  { value: 'new_review', label: 'Reviews' },
  { value: 'account_update', label: 'Account Updates' },
];
