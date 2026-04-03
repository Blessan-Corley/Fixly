import mongoose from 'mongoose';

export function toObjectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}

export function isValidObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

export function toStringId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof value === 'object' &&
    'toString' in value &&
    typeof (value as { toString?: unknown }).toString === 'function'
  ) {
    return (value as { toString: () => string }).toString();
  }
  return '';
}
