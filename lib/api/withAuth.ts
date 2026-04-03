import { type NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { requireAdmin, requireSession } from '@/lib/api/auth';

import { handleRouteError } from './errors';

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, session: Session) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await requireSession();
  if ('error' in auth) {
    return auth.error as NextResponse;
  }

  try {
    return await handler(request, auth.session as Session);
  } catch (error: unknown) {
    return handleRouteError(error);
  }
}

export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest, session: Session) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error as NextResponse;
  }

  try {
    return await handler(request, auth.session as Session);
  } catch (error: unknown) {
    return handleRouteError(error);
  }
}
