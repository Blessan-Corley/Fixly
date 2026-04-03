import { z } from 'zod';

const workingHoursSchema = z
  .object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  })
  .optional();

const booleanish = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return value;
}, z.boolean());

export const FixerSettingsSchema = z
  .object({
    availableNow: booleanish.optional(),
    serviceRadius: z.coerce.number().min(1).max(100).optional(),
    hourlyRate: z.coerce.number().min(0).max(10000).nullable().optional(),
    minimumJobValue: z.coerce.number().min(0).nullable().optional(),
    maximumJobValue: z.coerce.number().min(0).nullable().optional(),
    responseTime: z.string().max(100).optional(),
    autoApply: booleanish.optional(),
    emergencyAvailable: booleanish.optional(),
    workingHours: workingHoursSchema,
    workingDays: z
      .array(
        z.enum([
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ])
      )
      .min(1)
      .optional(),
    skills: z.array(z.string().min(1).max(50)).max(20).optional(),
    portfolio: z.array(z.record(z.string(), z.unknown())).max(10).optional(),
  })
  .refine(
    (value) => {
      if (
        value.minimumJobValue != null &&
        value.maximumJobValue != null &&
        value.minimumJobValue > value.maximumJobValue
      ) {
        return false;
      }

      return true;
    },
    {
      message: 'Minimum job value cannot be greater than maximum job value',
      path: ['minimumJobValue'],
    }
  );

const MAX_VERIFICATION_DOCUMENTS = 3;
const MAX_VERIFICATION_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const VERIFICATION_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

export function sanitizeOtpDigits(value: string, maxLength: number = 6): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function getVerificationReapplyDaysRemaining(
  lastApplicationDate?: string | Date | null
): number {
  if (!lastApplicationDate) {
    return 0;
  }

  const appliedAt =
    lastApplicationDate instanceof Date ? lastApplicationDate : new Date(lastApplicationDate);
  if (Number.isNaN(appliedAt.getTime())) {
    return 0;
  }

  const reapplyAt = new Date(appliedAt);
  reapplyAt.setDate(reapplyAt.getDate() + 7);

  const diffMs = reapplyAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function canAddVerificationDocuments(
  currentCount: number,
  incomingCount: number,
  maxDocuments: number = MAX_VERIFICATION_DOCUMENTS
): boolean {
  return currentCount + incomingCount <= maxDocuments;
}

export function validateVerificationUploadFiles(files: FileList | File[]): {
  validFiles: File[];
  errors: string[];
} {
  const fileList = Array.from(files);
  const validFiles: File[] = [];
  const errors: string[] = [];

  fileList.forEach((file) => {
    if (!VERIFICATION_FILE_TYPES.has(file.type)) {
      errors.push(`${file.name}: unsupported file type`);
      return;
    }

    if (file.size > MAX_VERIFICATION_FILE_SIZE_BYTES) {
      errors.push(`${file.name}: file exceeds 5MB limit`);
      return;
    }

    validFiles.push(file);
  });

  return { validFiles, errors };
}
