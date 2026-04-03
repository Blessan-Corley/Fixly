import {
  asTrimmedString,
  normalizeAttachment,
  parseDate,
  toFiniteNumber,
} from '@/lib/services/jobs/job.schema';
import type { NormalizedAttachment } from '@/lib/services/jobs/job.types';

type MutationError = {
  body: Record<string, unknown>;
  status: number;
};

type AttachmentValidationResult =
  | { attachments: NormalizedAttachment[]; error?: never }
  | { attachments?: never; error: MutationError };

type LocationValidationResult =
  | {
      address: string;
      city: string;
      state: string;
      pincode: string;
      lat: number | null;
      lng: number | null;
      error?: never;
    }
  | { error: MutationError };

type DateValidationResult =
  | { deadline: Date | null; scheduledDate: Date | null; error?: never }
  | { error: MutationError };

const err = (message: string, status = 400): MutationError => ({
  body: { success: false, message },
  status,
});

export const validateTitleDescription = (
  title: string,
  description: string
): MutationError | null => {
  if (title.length > 30) return err('Job title cannot exceed 30 characters');
  if (title.length < 10) return err('Job title must be at least 10 characters');
  if (description.length < 30) return err('Job description must be at least 30 characters');
  return null;
};

export const validateAttachments = (rawAttachments: unknown[]): AttachmentValidationResult => {
  const normalized = rawAttachments.map(normalizeAttachment);
  if (normalized.some((a) => a == null)) {
    return { error: err('Invalid attachment payload') };
  }

  const attachments = normalized as NormalizedAttachment[];
  const photos = attachments.filter((a) => a.isImage);
  const videos = attachments.filter((a) => a.isVideo);

  if (photos.length === 0) return { error: err('At least 1 photo is required') };
  if (photos.length > 5 || videos.length > 1) {
    return { error: err('Maximum 5 photos and 1 video allowed') };
  }

  return { attachments };
};

export const validateDates = (
  body: { deadline?: unknown; scheduledDate?: unknown },
  urgency: string,
  now: number
): DateValidationResult => {
  const hasDeadlineInput = body.deadline != null && asTrimmedString(body.deadline) !== '';
  const hasScheduledDateInput =
    body.scheduledDate != null && asTrimmedString(body.scheduledDate) !== '';
  const deadline = parseDate(body.deadline);
  const scheduledDate = parseDate(body.scheduledDate);

  if (urgency === 'scheduled') {
    if (!hasScheduledDateInput) {
      return { error: err('Scheduled date is required for scheduled jobs') };
    }
    if (!scheduledDate || scheduledDate.getTime() <= now) {
      return { error: { body: { message: 'Scheduled date must be in the future' }, status: 400 } };
    }
  } else {
    if (!hasDeadlineInput) {
      return { error: err('Deadline is required for flexible and ASAP jobs') };
    }
    if (!deadline || deadline.getTime() <= now) {
      return { error: { body: { message: 'Deadline must be in the future' }, status: 400 } };
    }
  }

  if (hasScheduledDateInput && (!scheduledDate || scheduledDate.getTime() <= now)) {
    return { error: { body: { message: 'Scheduled date must be in the future' }, status: 400 } };
  }

  return { deadline: deadline ?? null, scheduledDate: scheduledDate ?? null };
};

export const validateLocation = (
  location: Record<string, unknown>
): LocationValidationResult => {
  const address = asTrimmedString(location.address);
  const city = asTrimmedString(location.city);
  const state = asTrimmedString(location.state);
  const pincode = asTrimmedString(location.pincode);

  if (!address || !city || !state) {
    return { error: err('Address, city, and state are required') };
  }

  if (pincode && !/^\d{6}$/.test(pincode)) {
    return { error: err('Invalid pincode format (6 digits required)') };
  }

  const latProvided = location.lat != null && asTrimmedString(location.lat) !== '';
  const lngProvided = location.lng != null && asTrimmedString(location.lng) !== '';
  const lat = toFiniteNumber(location.lat);
  const lng = toFiniteNumber(location.lng);

  if (latProvided && lat == null) return { error: err('Invalid latitude value') };
  if (lngProvided && lng == null) return { error: err('Invalid longitude value') };
  if (lat != null && (lat < -90 || lat > 90)) return { error: err('Invalid latitude range') };
  if (lng != null && (lng < -180 || lng > 180)) return { error: err('Invalid longitude range') };

  return { address, city, state, pincode, lat: lat ?? null, lng: lng ?? null };
};

export const validateBudgetAmount = (
  budgetType: string,
  budgetAmount: number | null
): MutationError | null => {
  if (
    (budgetType === 'fixed' || budgetType === 'hourly') &&
    (budgetAmount == null || budgetAmount <= 0)
  ) {
    return err('Budget amount must be greater than 0 for fixed and hourly jobs');
  }
  return null;
};
