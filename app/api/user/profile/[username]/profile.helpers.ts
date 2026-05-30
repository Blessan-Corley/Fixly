export type UsernameParams = {
  params: Promise<{
    username: string;
  }>;
};

export type ProfileUser = Record<string, unknown> & {
  _id: unknown;
  phone?: string;
  address?: string;
};

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function parseCachedPayload(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}
