import type { LucideIcon } from 'lucide-react';

export type UserPlan = 'free' | 'pro' | 'premium';
export type SelectorMode = 'deadline' | 'scheduled';
export type DateInput = Date | string | number | null | undefined;
export type QuickOptionId =
  | 'asap'
  | 'today'
  | 'tomorrow'
  | 'week'
  | 'next_week'
  | 'next_month'
  | 'custom'
  | '';

export interface QuickOption {
  id: Exclude<QuickOptionId, '' | 'custom'>;
  label: string;
  description: string;
  hours: number;
  icon: LucideIcon;
  requiresPro: boolean;
  color: string;
  bgColor: string;
  badge?: string;
}

export interface DeadlineSelectorProps {
  selectedDeadline?: DateInput;
  onDeadlineSelect: (date: Date | null) => void;
  userPlan?: UserPlan;
  required?: boolean;
  className?: string;
  error?: string;
  mode?: SelectorMode;
  customTitle?: string;
  customDescription?: string;
}
