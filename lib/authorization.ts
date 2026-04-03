import { NextResponse } from 'next/server';

export type Resource =
  | 'job'
  | 'user'
  | 'review'
  | 'dispute'
  | 'conversation'
  | 'subscription'
  | 'admin'
  | 'application';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'moderate' | 'access';

export type UserRole = 'hirer' | 'fixer' | 'admin';

export type AuthorizableUser = {
  id?: string | null;
  role?: string | null;
};

export type AuthorizableSession = {
  user?: AuthorizableUser | null;
} | null;

export type StandardErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

const rolePermissions: Record<UserRole, Partial<Record<Resource, Action[]>>> = {
  admin: {
    job: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
    user: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
    review: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
    dispute: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
    conversation: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
    subscription: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
    admin: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
    application: ['read', 'create', 'update', 'delete', 'moderate', 'access'],
  },
  hirer: {
    job: ['read', 'create', 'update', 'delete'],
    conversation: ['read', 'create'],
    review: ['read', 'create'],
    dispute: ['read', 'create'],
    application: ['read', 'update'],
    user: ['read', 'update'],
  },
  fixer: {
    job: ['read'],
    application: ['create', 'read', 'update', 'delete'],
    conversation: ['read', 'create'],
    review: ['read', 'create'],
    dispute: ['read', 'create'],
    subscription: ['read', 'create', 'update'],
    user: ['read', 'update'],
  },
};

export function can(user: AuthorizableUser, action: Action, resource: Resource): boolean {
  const role = user.role;
  if (role !== 'hirer' && role !== 'fixer' && role !== 'admin') {
    return false;
  }

  const allowedActions = rolePermissions[role][resource] ?? [];
  return allowedActions.includes(action);
}

export function requirePermission(user: AuthorizableUser, action: Action, resource: Resource): void {
  if (!can(user, action, resource)) {
    const error = new Error(`Role "${user.role ?? 'unknown'}" cannot ${action} ${resource}`) as Error & {
      status?: number;
      code?: string;
    };
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }
}

export function canTargetUser(session: AuthorizableSession, targetUserId: string): boolean {
  const sessionUser = session?.user;
  if (!sessionUser?.id) {
    return false;
  }

  return sessionUser.id === targetUserId || sessionUser.role === 'admin';
}

export function createStandardError(status: number, code: string, message: string): NextResponse {
  const body: StandardErrorBody = {
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(body, { status });
}
