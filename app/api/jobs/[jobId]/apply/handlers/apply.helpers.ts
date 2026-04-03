import { sanitizeString } from '../../job-route-utils';

import type { ApplyBody, MaterialInput, TimeEstimateInput } from './apply.types';
import { asRecord } from './shared';

export function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function normalizeTimeEstimate(
  input?: TimeEstimateInput,
  legacyText?: string
): { value: number; unit: 'hours' | 'days' | 'weeks' } | null {
  if (input && input.value !== undefined) {
    const value = Number(input.value);
    const unitRaw = sanitizeString(input.unit ?? 'hours').toLowerCase();

    if (Number.isFinite(value) && value > 0) {
      const unit = unitRaw === 'days' || unitRaw === 'weeks' ? unitRaw : 'hours';
      return { value, unit };
    }
  }

  const text = sanitizeString(legacyText).toLowerCase();
  if (!text) return null;

  const match = text.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|day|days|week|weeks)/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  const unitText = match[2].toLowerCase();
  const unit: 'hours' | 'days' | 'weeks' = unitText.startsWith('day')
    ? 'days'
    : unitText.startsWith('week')
      ? 'weeks'
      : 'hours';

  return { value, unit };
}

export function normalizeDescription(body: ApplyBody): string {
  const description = sanitizeString(body.description);
  if (description) return description;

  const segments = [
    sanitizeString(body.workPlan),
    sanitizeString(body.coverLetter),
    sanitizeString(body.message),
  ].filter(Boolean);

  return segments.join('\n\n').trim();
}

export function normalizeMaterialsList(
  input?: MaterialInput[]
): Array<{ item: string; quantity: number; estimatedCost: number }> {
  if (!Array.isArray(input)) return [];

  return input
    .map((material) => ({
      item: sanitizeString(material?.item),
      quantity: Math.max(1, Number(material?.quantity ?? 1)),
      estimatedCost: Math.max(0, Number(material?.estimatedCost ?? 0)),
    }))
    .filter((material) => !!material.item)
    .slice(0, 30);
}

export function getUserPhotoUrl(user: unknown): string | undefined {
  const record = asRecord(user);
  return typeof record.photoURL === 'string' ? record.photoURL : undefined;
}
