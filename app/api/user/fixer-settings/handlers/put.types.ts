import { z } from 'zod';

import type { UserPortfolioItem } from '@/types/User';

export type FixerSettingsBody = {
  availableNow?: unknown;
  serviceRadius?: unknown;
  hourlyRate?: unknown;
  minimumJobValue?: unknown;
  maximumJobValue?: unknown;
  responseTime?: unknown;
  workingHours?: unknown;
  workingDays?: unknown;
  skills?: unknown;
  portfolio?: unknown;
  autoApply?: unknown;
  emergencyAvailable?: unknown;
};

export type WorkingHoursInput = {
  start?: unknown;
  end?: unknown;
};

export type ValidatedFixerSettings = {
  errors: string[];
  availableNow: boolean | null | undefined;
  serviceRadiusNumber: number | null | undefined;
  hourlyRateNumber: number | null | undefined;
  minimumJobValueNumber: number | null | undefined;
  maximumJobValueNumber: number | null | undefined;
  responseTime: string | null | undefined;
  workingHours: { start: string; end: string } | undefined;
  workingDays: string[] | undefined;
  skills: string[] | undefined;
  portfolio: UserPortfolioItem[] | undefined;
  autoApply: boolean | null | undefined;
  emergencyAvailable: boolean | null | undefined;
};

export const FixerSettingsBodySchema = z.object({
  availableNow: z.unknown().optional(),
  serviceRadius: z.unknown().optional(),
  hourlyRate: z.unknown().optional(),
  minimumJobValue: z.unknown().optional(),
  maximumJobValue: z.unknown().optional(),
  responseTime: z.unknown().optional(),
  workingHours: z.unknown().optional(),
  workingDays: z.unknown().optional(),
  skills: z.unknown().optional(),
  portfolio: z.unknown().optional(),
  autoApply: z.unknown().optional(),
  emergencyAvailable: z.unknown().optional(),
});

export const VALID_RESPONSE_TIMES = new Set(['0.5', '1', '2', '4', '8', '24']);
export const VALID_WORKING_DAYS = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);
export const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
