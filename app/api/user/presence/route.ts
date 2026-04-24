import { type NextRequest } from 'next/server';

import { requireSession, respond } from '@/lib/api';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest): Promise<Response> {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  const csrfResult = csrfGuard(request, auth.session);
  if (csrfResult) return csrfResult;

  let online = false;
  try {
    const body = (await request.json()) as unknown;
    if (body !== null && typeof body === 'object') {
      online = Boolean((body as Record<string, unknown>).online);
    }
  } catch {
    // default to offline if body parse fails
  }

  await connectDB();

  await User.findByIdAndUpdate(auth.session.user.id, {
    $set: {
      isOnline: online,
      ...(online ? {} : { lastSeen: new Date() }),
    },
  });

  return respond({ ok: true });
}
