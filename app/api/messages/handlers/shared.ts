import { Types } from 'mongoose';

export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : '';
}

export function isNotFoundError(error: unknown): boolean {
  return errorMessage(error).includes('not found');
}

export function isAccessDeniedError(error: unknown): boolean {
  const message = errorMessage(error);
  return message.includes('access denied') || message.includes('unauthorized');
}

export function isConversationUnavailableError(error: unknown): boolean {
  return errorMessage(error).includes('conversation not available');
}
