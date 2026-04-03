// Phase 2: Added Redis-backed idempotency guards for Stripe webhook processing.
import { redisUtils } from '@/lib/redis';

const WEBHOOK_TTL_SECONDS = 24 * 60 * 60;

function getWebhookKey(eventId: string): string {
  return `stripe:webhook:processed:${eventId}`;
}

export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  return redisUtils.exists(getWebhookKey(eventId));
}

export async function markWebhookProcessed(eventId: string): Promise<void> {
  await redisUtils.set(getWebhookKey(eventId), '1', WEBHOOK_TTL_SECONDS);
}

export async function clearWebhookProcessed(eventId: string): Promise<void> {
  await redisUtils.del(getWebhookKey(eventId));
}
