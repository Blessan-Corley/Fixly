import { NextRequest } from 'next/server';

import { ok, serverError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { getPublicUserProfile } from '@/lib/services/public-profiles/service';

export async function GET(_req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    const user = await getPublicUserProfile(params.userId);
    return ok(user);
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/users/[userId]/public]');
    return serverError();
  }
}
