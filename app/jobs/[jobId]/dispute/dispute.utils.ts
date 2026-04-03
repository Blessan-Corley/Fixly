import type { EvidenceItem, JobDetails, JobParty } from './dispute.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

export function getMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const message = asString(payload.message);
    if (message) {
      return message;
    }
  }
  return fallback;
}

export function getPartyId(party: JobParty | null): string {
  return party?.id ?? '';
}

export function normalizeParty(value: unknown): JobParty | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value._id) || asString(value.id);
  if (!id) {
    return null;
  }

  return {
    id,
    name: asString(value.name) || 'Unknown user',
    username: asString(value.username) || '',
    photoURL: asString(value.photoURL) || asString(value.picture) || null,
  };
}

export function normalizeJob(jobValue: unknown): JobDetails | null {
  if (!isRecord(jobValue)) {
    return null;
  }

  const id = asString(jobValue._id) || asString(jobValue.id);
  if (!id) {
    return null;
  }

  const location = isRecord(jobValue.location) ? jobValue.location : {};
  const budget = isRecord(jobValue.budget) ? jobValue.budget : {};
  const client =
    normalizeParty(jobValue.client) ||
    normalizeParty(jobValue.createdBy) ||
    normalizeParty(jobValue.hirer);
  const fixer = normalizeParty(jobValue.fixer) || normalizeParty(jobValue.assignedTo);

  return {
    id,
    title: asString(jobValue.title) || 'Untitled job',
    category: asString(jobValue.category) || 'general',
    status: asString(jobValue.status) || 'unknown',
    budgetAmount: asNumber(budget.amount),
    locationAddress:
      asString(location.address) || asString(location.city) || 'Location not specified',
    client,
    fixer,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

export function fileToEvidence(file: File): Promise<EvidenceItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }

      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: result,
        filename: file.name,
        description: '',
      });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
