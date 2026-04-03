// Phase 2: Aligned shared session auth with server-safe NextAuth imports and test CSRF sessions.
import type { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { forbidden, unauthorized } from '@/lib/api/response';
import { authOptions } from '@/lib/auth';
import { env } from '@/lib/env';

export type AuthRole = 'hirer' | 'fixer' | 'admin';
export type AuthResult = { session: Session } | { error: NextResponse };

type GetServerSessionFn = typeof import('next-auth/next')['getServerSession'];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGetServerSessionFn(value: unknown): value is GetServerSessionFn {
  return typeof value === 'function';
}

function isSession(value: unknown): value is Session {
  return isObjectRecord(value) && 'user' in value;
}

function getServerSessionFn(): GetServerSessionFn {
  const nextAuthModule: unknown = require('next-auth/next');
  if (!isObjectRecord(nextAuthModule) || !isGetServerSessionFn(nextAuthModule.getServerSession)) {
    throw new Error('next-auth/next.getServerSession is unavailable');
  }

  return nextAuthModule.getServerSession;
}

function attachTestCsrfToken(session: Session | null): Session | null {
  if (env.NODE_ENV !== 'test' || !session?.user?.id) {
    return session;
  }

  if (typeof session.user.csrfToken === 'string' && session.user.csrfToken.length > 0) {
    return session;
  }

  return {
    ...session,
    user: {
      ...session.user,
      csrfToken: process.env.TEST_CSRF_TOKEN,
    },
  };
}

export async function getOptionalSession(): Promise<Session | null> {
  const session = await getServerSessionFn()(authOptions);
  return attachTestCsrfToken(isSession(session) ? session : null);
}

export async function requireSession(): Promise<AuthResult> {
  const rawSession = await getServerSessionFn()(authOptions);
  const session = attachTestCsrfToken(isSession(rawSession) ? rawSession : null);
  if (!session?.user?.id) {
    return { error: unauthorized() };
  }
  return { session };
}

export async function requireRole(role: AuthRole | AuthRole[]): Promise<AuthResult> {
  const auth = await requireSession();
  if ('error' in auth) {
    return auth;
  }

  const roles = Array.isArray(role) ? role : [role];
  const userRole = sessionRole(auth.session.user.role);
  if (!userRole || !roles.includes(userRole)) {
    return { error: forbidden() };
  }

  return auth;
}

export async function requireAdmin(): Promise<AuthResult> {
  return requireRole('admin');
}

function sessionRole(value: unknown): AuthRole | null {
  return value === 'hirer' || value === 'fixer' || value === 'admin' ? value : null;
}
