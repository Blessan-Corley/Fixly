import { after, NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { badRequest, ok, serverError } from '@/lib/api/response';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { suspendUser } from '@/lib/services/admin/user-management';

const suspendUserSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  const parsed = await parseBody(req, suspendUserSchema);
  if ('error' in parsed) return parsed.error;

  try {
    const result = await suspendUser(
      params.userId,
      auth.session.user.id as string,
      parsed.data.reason
    );

    const email = typeof result.email === 'string' ? result.email : '';
    if (!email) {
      return badRequest('User email is required for suspension workflow');
    }

    after(async () => {
      await Promise.allSettled([
        inngest.send({
          name: 'user/account.suspended',
          data: {
            userId: params.userId,
            email,
            reason: parsed.data.reason,
          },
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
    logger.error({ error }, '[PATCH /api/admin/users/[userId]/suspend]');
    return serverError();
  }
}
