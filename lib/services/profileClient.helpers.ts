import type { ProfilePhotoRecord, ProfileUser } from '../../types/profile';
import type { ApiSuccessMessageResponse } from '../../types/profile-api';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

export const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const parseSuccessMessageResponse = (payload: unknown): ApiSuccessMessageResponse => {
  if (!isRecord(payload)) return { success: false, message: 'Invalid server response' };
  return { success: payload.success === true, message: asString(payload.message) };
};

export const parsePartialUser = (value: unknown): Partial<ProfileUser> | undefined => {
  if (!isRecord(value)) return undefined;
  return value as Partial<ProfileUser>;
};

export const parseProfilePhotoRecord = (value: unknown): ProfilePhotoRecord | undefined => {
  if (!isRecord(value)) return undefined;
  return value as ProfilePhotoRecord;
};

export const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};
