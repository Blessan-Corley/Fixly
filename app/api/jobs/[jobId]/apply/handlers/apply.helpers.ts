import { badRequest, respond } from '@/lib/api/response';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

import { sanitizeString } from '../../job-route-utils';

import type { ApplyBody, MaterialInput, TimeEstimateInput } from './apply.types';
import { asRecord } from './shared';

type JobBudget = { type?: string; amount?: number };

export type ValidatedPayload = {
  proposedAmount: number;
  description: string;
  requirements: string;
  specialNotes: string;
  negotiationNotes: string;
};

export async function validateAndParseApplication(
  body: ApplyBody,
  jobBudget: JobBudget | undefined,
  userId: string
): Promise<{ error: Response } | { ok: true; data: ValidatedPayload }> {
  const proposedAmount = parseNumber(body.proposedAmount);
  if (proposedAmount === null || proposedAmount <= 0) {
    return { error: badRequest('Proposed amount is required and must be greater than 0') };
  }
  if (proposedAmount > 1000000) {
    return { error: badRequest('Proposed amount exceeds allowed maximum') };
  }

  if (jobBudget?.type === 'fixed' && typeof jobBudget.amount === 'number') {
    const variance = Math.abs(proposedAmount - jobBudget.amount);
    const maxVariance = jobBudget.amount * 0.5;
    if (variance > maxVariance) {
      return {
        error: respond(
          {
            message: `Proposed amount (INR ${proposedAmount.toLocaleString()}) is too far from the fixed budget (INR ${jobBudget.amount.toLocaleString()}). Please propose within +/-50% of the budget.`,
            suggestedRange: {
              min: Math.round(jobBudget.amount * 0.5),
              max: Math.round(jobBudget.amount * 1.5),
            },
          },
          400
        ),
      };
    }
  }

  const description = normalizeDescription(body);
  if (!description || description.length < 20) {
    return { error: badRequest('Please provide a description with at least 20 characters') };
  }
  if (description.length > 600) {
    return { error: badRequest('Description must be less than 600 characters') };
  }

  const requirements = sanitizeString(body.requirements);
  const specialNotes = sanitizeString(body.specialNotes);
  const negotiationNotes = sanitizeString(
    body.negotiationNotes ?? body.coverLetter ?? body.message
  );

  if (requirements.length > 500 || specialNotes.length > 300 || negotiationNotes.length > 500) {
    return { error: badRequest('One or more optional fields exceed allowed length') };
  }

  const fieldsToCheck = [
    { name: 'description', value: description },
    { name: 'requirements', value: requirements },
    { name: 'specialNotes', value: specialNotes },
    { name: 'negotiationNotes', value: negotiationNotes },
  ];

  for (const field of fieldsToCheck) {
    if (!field.value) continue;
    const moderationResult = await moderateUserGeneratedContent(field.value, {
      context: 'job_application',
      fieldLabel: field.name,
      userId,
    });
    if (!moderationResult.allowed) {
      return {
        error: respond(
          {
            message: `Your ${field.name} contains restricted content: ${moderationResult.message}`,
            violations: moderationResult.violations,
            type: 'sensitive_content',
            field: field.name,
          },
          400
        ),
      };
    }
  }

  return { ok: true, data: { proposedAmount, description, requirements, specialNotes, negotiationNotes } };
}

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
