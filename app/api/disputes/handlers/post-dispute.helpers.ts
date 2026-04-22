import { badRequest } from '@/lib/api';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

type EvidenceInput = {
  type: string;
  url: string;
  filename?: string;
  description?: string;
};

type NormalizedEvidence = {
  type: 'image' | 'document' | 'screenshot' | 'chat_log';
  url: string;
  filename?: string;
  description?: string;
};

export async function moderateDisputeContent(
  fields: Array<{ label: string; value: string }>,
  evidence: EvidenceInput[],
  userId: string
): Promise<Response | null> {
  for (const field of fields) {
    if (!field.value) continue;
    const moderation = await moderateUserGeneratedContent(field.value, {
      context: 'dispute',
      fieldLabel: field.label,
      userId,
    });
    if (!moderation.allowed) {
      return badRequest(moderation.message ?? 'Content validation failed', {
        violations: moderation.violations,
        suggestions: moderation.suggestions,
      });
    }
  }

  for (const item of evidence) {
    const descriptionValue =
      typeof item?.description === 'string' ? item.description.trim() : '';
    if (!descriptionValue) continue;
    const moderation = await moderateUserGeneratedContent(descriptionValue, {
      context: 'dispute',
      fieldLabel: 'Evidence description',
      userId,
    });
    if (!moderation.allowed) {
      return badRequest(moderation.message ?? 'Content validation failed', {
        violations: moderation.violations,
        suggestions: moderation.suggestions,
      });
    }
  }

  return null;
}

export function computeDisputePriority(
  amount: number,
  category: string | undefined
): 'low' | 'medium' | 'high' | 'urgent' {
  if (amount > 100000) return 'urgent';
  if (amount > 50000 || category === 'safety_concern') return 'high';
  if (amount < 5000) return 'low';
  return 'medium';
}

export function normalizeDisputeEvidence(evidence: EvidenceInput[]): NormalizedEvidence[] {
  const VALID_TYPES = new Set(['image', 'document', 'screenshot', 'chat_log']);
  return evidence
    .filter((item) => item?.type && item?.url && VALID_TYPES.has(item.type))
    .map((item) => ({
      type: item.type as NormalizedEvidence['type'],
      url: item.url,
      filename: item.filename,
      description: item.description,
    }));
}
