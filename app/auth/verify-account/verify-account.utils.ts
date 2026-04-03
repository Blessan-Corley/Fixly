export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getMessage = (payload: unknown, fallback: string): string => {
  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
};

export const isVerifiedUserPayload = (value: unknown): boolean => {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }
  return value.user.isVerified === true;
};
