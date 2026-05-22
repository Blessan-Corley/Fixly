export type Filters = Record<string, unknown>;

export type NotificationsResponse = {
  data?: {
    notifications?: unknown[];
    unreadCount?: number;
  };
  message?: string;
  error?: string;
  notifications?: unknown[];
  pagination?: Record<string, unknown>;
  unreadCount?: number;
  [key: string]: unknown;
};

export function toSearchParams(filters: Filters = {}): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params;
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (typeof p.message === 'string') return p.message;
    if (typeof p.error === 'string') return p.error;
  }
  return fallback;
}

export async function fetchNotifications(filters: Filters = {}): Promise<NotificationsResponse> {
  const params = toSearchParams(filters);
  const response = await fetch(`/api/user/notifications?${params.toString()}`);
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to fetch notifications'));
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};

  const normalizedPayload = payload as NotificationsResponse;
  if (normalizedPayload.data && typeof normalizedPayload.data === 'object') {
    return {
      notifications: normalizedPayload.data.notifications,
      unreadCount: normalizedPayload.data.unreadCount,
      pagination: normalizedPayload.pagination,
      message: normalizedPayload.message,
    };
  }

  return normalizedPayload;
}

export function hasActiveFilters(filters: Filters): boolean {
  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '' && value !== 'all';
  });
}
