import type { IUser } from '../../types/User';

export function hasActivePaidPlan(user: { plan?: IUser['plan'] }): boolean {
  if (user.plan?.type !== 'pro' || user.plan.status !== 'active') {
    return false;
  }
  const endDate = user.plan.endDate ?? user.plan.expiresAt;
  if (!endDate) return true;
  return new Date(endDate).getTime() > Date.now();
}

export function hasRoleMutation(update: unknown): boolean {
  if (!update || typeof update !== 'object') return false;
  const candidate = update as {
    role?: unknown;
    $set?: { role?: unknown };
    $unset?: { role?: unknown };
  };
  return (
    candidate.role !== undefined ||
    candidate.$set?.role !== undefined ||
    candidate.$unset?.role !== undefined
  );
}
