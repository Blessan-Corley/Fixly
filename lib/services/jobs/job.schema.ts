import { Types } from 'mongoose';

import type {
  AttachmentInput,
  BudgetType,
  CreateJobBody,
  JobStatus,
  JobType,
  NormalizedAttachment,
  Urgency,
} from '@/lib/services/jobs/job.types';
import {
  VALID_BUDGET_TYPES,
  VALID_JOB_TYPES,
  VALID_STATUSES,
  VALID_URGENCIES,
} from '@/lib/services/jobs/job.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  if (typeof value === 'number') return value === 1;
  return false;
}

export function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parseDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

export function normalizeSkillsRequired(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const entry of value) {
    const skill = asTrimmedString(entry).toLowerCase();
    if (!skill) continue;
    if (skill.length < 2 || skill.length > 50) continue;
    unique.add(skill);
  }

  return Array.from(unique).slice(0, 30);
}

export function normalizeAttachment(value: unknown): NormalizedAttachment | null {
  if (!isRecord(value)) return null;
  const input = value as AttachmentInput;

  const id = asTrimmedString(input.id);
  const url = asTrimmedString(input.url);
  const publicId = asTrimmedString(input.publicId);
  const type = asTrimmedString(input.type);
  const filename = asTrimmedString(input.filename) || asTrimmedString(input.name) || 'unknown';
  const size = toFiniteNumber(input.size);

  if (!id || !url || !publicId || !type || size == null || size < 0) {
    return null;
  }

  const inferredImage = type.toLowerCase().startsWith('image/');
  const inferredVideo = type.toLowerCase().startsWith('video/');

  let isImage = toBoolean(input.isImage);
  let isVideo = toBoolean(input.isVideo);

  if (!isImage && !isVideo) {
    isImage = inferredImage;
    isVideo = inferredVideo;
  }

  if (isImage && isVideo) {
    if (inferredImage && !inferredVideo) {
      isVideo = false;
    } else if (!inferredImage && inferredVideo) {
      isImage = false;
    }
  }

  if (!isImage && !isVideo) {
    return null;
  }

  const width = toFiniteNumber(input.width) ?? undefined;
  const height = toFiniteNumber(input.height) ?? undefined;
  const duration = toFiniteNumber(input.duration) ?? undefined;
  const createdAt = parseDate(input.createdAt) || new Date();

  return {
    id,
    url,
    publicId,
    filename,
    type,
    size,
    isImage,
    isVideo,
    width,
    height,
    duration,
    createdAt,
  };
}

export function getStatusFromParam(value: string): JobStatus | null {
  return (VALID_STATUSES as readonly string[]).includes(value) ? (value as JobStatus) : null;
}

export function getUrgency(value: unknown): Urgency {
  const normalized = asTrimmedString(value).toLowerCase();
  return (VALID_URGENCIES as readonly string[]).includes(normalized)
    ? (normalized as Urgency)
    : 'flexible';
}

export function getJobType(value: unknown): JobType {
  const normalized = asTrimmedString(value).toLowerCase();
  return (VALID_JOB_TYPES as readonly string[]).includes(normalized)
    ? (normalized as JobType)
    : 'one-time';
}

export function getBudgetType(value: unknown): BudgetType {
  const normalized = asTrimmedString(value).toLowerCase();
  return (VALID_BUDGET_TYPES as readonly string[]).includes(normalized)
    ? (normalized as BudgetType)
    : 'negotiable';
}

export function parseCreateJobBody(body: unknown): CreateJobBody | null {
  return isRecord(body) ? (body as CreateJobBody) : null;
}
