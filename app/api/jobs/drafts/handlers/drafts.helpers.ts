import { Types } from 'mongoose';

import type { DraftAttachmentInput, DraftFormData, DraftSummarySource } from './drafts.types';

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded
    ? (forwarded.split(',')[0]?.trim() ?? 'unknown')
    : (request.headers.get('x-real-ip') ?? 'unknown');
}

export function isValidObjectId(value?: string): value is string {
  return !!value && Types.ObjectId.isValid(value);
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseStep(value: unknown, fallback = 1): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 4) return fallback;
  return numeric;
}

export function normalizeSaveType(value: unknown): 'auto' | 'manual' | 'step_change' {
  if (value === 'manual' || value === 'step_change') return value;
  return 'auto';
}

export function normalizeCompletedSteps(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<number>();
  for (const step of value) {
    const numeric = parseStep(step, -1);
    if (numeric >= 1 && numeric <= 4) set.add(numeric);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function normalizeAttachments(value: unknown): DraftAttachmentInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((attachment) => {
    const source = (attachment || {}) as DraftAttachmentInput;
    return { ...source, filename: source.filename ?? source.name ?? 'unknown' };
  });
}

export function normalizeFormData(value: unknown): DraftFormData {
  if (!value || typeof value !== 'object') return {};
  return value as DraftFormData;
}

export function toDraftSummary(draft: DraftSummarySource): Record<string, unknown> {
  return {
    _id: draft._id,
    title: draft.title ?? 'Untitled Job',
    description: draft.description,
    completionPercentage: draft.completionPercentage,
    currentStep: draft.currentStep,
    draftStatus: draft.draftStatus,
    lastActivity: draft.lastActivity,
    lastAutoSave: draft.lastAutoSave,
    lastManualSave: draft.lastManualSave,
    ageInHours: draft.ageInHours,
    hoursUntilExpiry: draft.hoursUntilExpiry,
    isExpired: draft.isExpired,
    photoCount: draft.photoCount,
    videoCount: draft.videoCount,
    convertedToJob: draft.convertedToJob,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}
