import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { invalidateCache } from '@/lib/redisCache';
import User from '@/models/User';

export type JsonObject = Record<string, unknown>;

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

export function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function notifyUser(
  userId: unknown,
  type: string,
  title: string,
  message: string,
  data: JsonObject = {}
): Promise<void> {
  if (!userId) return;

  try {
    const recipient = await User.findById(userId);
    if (!recipient) return;

    await recipient.addNotification(type, title, message, data);
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to send job notification');
  }
}

export async function invalidateJobReadCaches(
  jobId: unknown,
  extraPatterns: string[] = []
): Promise<void> {
  const normalizedJobId = toIdString(jobId);
  if (!normalizedJobId) return;

  const patterns = Array.from(
    new Set([
      `/api/jobs/${normalizedJobId}`,
      '/api/jobs/browse',
      '/api/jobs/search',
      ...extraPatterns,
    ])
  );

  const results = await Promise.allSettled(patterns.map((pattern) => invalidateCache(pattern)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn({ reason: result.reason, pattern: patterns[index] }, `Failed to invalidate cache pattern ${patterns[index]}`);
    }
  });

  // Also invalidate direct redisUtils keys for job detail (per-user) and applications
  await Promise.allSettled([
    redisUtils.invalidatePattern(`job:detail:v1:${normalizedJobId}:*`),
    redisUtils.del(`job:applications:v1:${normalizedJobId}`),
  ]);
}
