import { after, NextRequest } from 'next/server';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { requireAdmin } from '@/lib/api/auth';
import { ok, serverError } from '@/lib/api/response';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import {
  sendVerificationNotification,
  verifyUser,
} from '@/lib/services/admin/user-management';

export async function PATCH(_req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const csrfResult = csrfGuard(_req, auth.session);
  if (csrfResult) return csrfResult;

  try {
    const result = await verifyUser(params.userId, auth.session.user.id as string);

    after(async () => {
      await Promise.allSettled([
        sendVerificationNotification(params.userId),
        publishToChannel(Channels.user(params.userId), Events.user.notificationSent, {
          notificationId: `verification:${params.userId}:${Date.now()}`,
          type: 'verification_update',
          title: 'You are verified',
          message: 'Your Fixly profile has been verified successfully.',
          link: '/dashboard/profile',
          createdAt: new Date().toISOString(),
        }),
        invalidateAuthCache(params.userId),
        redisUtils.del(
          `user:profile:v1:${params.userId}`,
          `user:public-profile:${params.userId}`
        ),
        redisUtils.invalidatePattern('admin:users:v1:*'),
      ]);
    });

    return ok(result);
  } catch (error: unknown) {
    logger.error({ error }, '[PATCH /api/admin/users/[userId]/verify]');
    return serverError();
  }
}
