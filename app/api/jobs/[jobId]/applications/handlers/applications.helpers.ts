import type { FixerContact } from './applications.types';

export function hasSelectMethod(
  value: unknown
): value is { select: (fields: string) => unknown } {
  return typeof value === 'object' && value !== null && 'select' in value;
}

export function hasLeanMethod(
  value: unknown
): value is { lean: () => Promise<FixerContact | null> } {
  return typeof value === 'object' && value !== null && 'lean' in value;
}

export function isFixerContact(value: unknown): value is FixerContact {
  return typeof value === 'object' && value !== null;
}
