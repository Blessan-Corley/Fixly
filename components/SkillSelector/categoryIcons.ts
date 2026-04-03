import {
  Zap,
  Wrench,
  Hammer,
  Settings,
  Smartphone,
  Sparkle,
  Car,
  Truck,
  Scissors,
  Camera,
  Shield,
  Monitor,
  Stethoscope,
  TreePine,
  GraduationCap,
} from 'lucide-react';

import type { CategoryIconData } from './types';

export const categoryIcons: Record<string, CategoryIconData> = {
  'Electrical Services': {
    icon: Zap,
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-500',
  },
  'Plumbing Services': {
    icon: Wrench,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-500',
  },
  'Construction & Renovation': {
    icon: Hammer,
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-500',
  },
  'Installation Services': {
    icon: Settings,
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-500',
  },
  'Device Repair': {
    icon: Smartphone,
    color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    bgColor: 'bg-indigo-500',
  },
  'Cleaning Services': {
    icon: Sparkle,
    color: 'bg-fixly-accent/20 dark:bg-fixly-accent/10 text-fixly-accent dark:text-fixly-accent',
    bgColor: 'bg-fixly-accent',
  },
  'Automotive Services': {
    icon: Car,
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    bgColor: 'bg-red-500',
  },
  'Gardening Services': {
    icon: TreePine,
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
  },
  'Moving Services': {
    icon: Truck,
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-500',
  },
  'Beauty & Wellness': {
    icon: Scissors,
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
    bgColor: 'bg-pink-500',
  },
  'Healthcare Services': {
    icon: Stethoscope,
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    bgColor: 'bg-rose-500',
  },
  'Photography & Events': {
    icon: Camera,
    color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    bgColor: 'bg-violet-500',
  },
  'Tutoring & Education': {
    icon: GraduationCap,
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
    bgColor: 'bg-cyan-500',
  },
  'Security Services': {
    icon: Shield,
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-500',
  },
  'Digital Services': {
    icon: Monitor,
    color:
      'bg-fixly-primary/20 dark:bg-fixly-primary/10 text-fixly-primary dark:text-fixly-primary',
    bgColor: 'bg-fixly-primary',
  },
};
