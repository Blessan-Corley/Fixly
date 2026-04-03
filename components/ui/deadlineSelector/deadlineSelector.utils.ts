import {
  Calendar,
  CalendarDays,
  Clock,
  Zap,
} from 'lucide-react';

import type { DateInput, QuickOption, SelectorMode } from './deadlineSelector.types';

export function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDeadline(dateValue: DateInput): string {
  const deadline = toValidDate(dateValue);
  if (!deadline) return '';

  const now = new Date();
  const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffHours < 4) return 'ASAP (Within 4 hours)';
  if (diffHours < 24) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;

  return deadline.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMinDate(isPro: boolean): Date {
  const minDate = new Date();
  if (!isPro) {
    minDate.setHours(minDate.getHours() + 24);
  }
  return minDate;
}

export function getQuickOptions(mode: SelectorMode): QuickOption[] {
  if (mode === 'scheduled') {
    return [
      {
        id: 'today',
        label: 'Today',
        description: 'Schedule for today',
        hours: 4,
        icon: Clock,
        requiresPro: true,
        color: 'text-red-500',
        bgColor: 'bg-red-50 border-red-200',
        badge: 'Pro Only',
      },
      {
        id: 'tomorrow',
        label: 'Tomorrow',
        description: 'Schedule for tomorrow',
        hours: 48,
        icon: CalendarDays,
        requiresPro: false,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 border-blue-200',
      },
      {
        id: 'next_week',
        label: 'Next Week',
        description: 'Schedule for next week',
        hours: 168,
        icon: Calendar,
        requiresPro: false,
        color: 'text-green-500',
        bgColor: 'bg-green-50 border-green-200',
      },
      {
        id: 'next_month',
        label: 'Next Month',
        description: 'Schedule for next month',
        hours: 720,
        icon: Calendar,
        requiresPro: false,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50 border-purple-200',
      },
    ];
  }

  return [
    {
      id: 'asap',
      label: 'ASAP (Within 4 hours)',
      description: 'Highest priority, immediate attention',
      hours: 4,
      icon: Zap,
      requiresPro: true,
      color: 'text-red-500',
      bgColor: 'bg-red-50 border-red-200',
      badge: 'Pro Only',
    },
    {
      id: 'today',
      label: 'Today (Within 24 hours)',
      description: 'Same day completion',
      hours: 24,
      icon: Clock,
      requiresPro: true,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 border-amber-200',
      badge: 'Pro Only',
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      description: 'Next day completion',
      hours: 48,
      icon: CalendarDays,
      requiresPro: false,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      id: 'week',
      label: 'Within a Week',
      description: 'Flexible timeline, 7 days',
      hours: 168,
      icon: Calendar,
      requiresPro: false,
      color: 'text-green-500',
      bgColor: 'bg-green-50 border-green-200',
    },
  ];
}
