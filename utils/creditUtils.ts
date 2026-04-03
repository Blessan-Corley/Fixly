/**
 * Frontend utility functions for credit and subscription management.
 */

type UserRole = 'hirer' | 'fixer' | string;
type PlanType = 'free' | 'pro' | string;
type PlanStatus = 'active' | 'expired' | 'cancelled' | 'none' | string;

interface UserPlan {
  type?: PlanType;
  status?: PlanStatus;
  creditsUsed?: number;
  startDate?: string | Date;
  endDate?: string | Date;
}

interface CreditUser {
  role?: UserRole;
  banned?: boolean;
  plan?: UserPlan;
  lastJobPostedAt?: string | Date;
}

export interface PlanStatusResult {
  type: PlanType;
  status: PlanStatus;
  isActive: boolean;
  isPro: boolean;
  creditsUsed?: number;
  startDate?: string | Date;
  endDate?: string | Date;
}

const FREE_FIXER_CREDIT_LIMIT = 3;
const HIRER_POST_INTERVAL_MS = 4 * 60 * 60 * 1000;

function isActivePro(plan?: UserPlan): boolean {
  if (plan?.type !== 'pro' || plan.status !== 'active') {
    return false;
  }

  if (!plan.endDate) {
    return true;
  }

  const endDate = new Date(plan.endDate);
  return !Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now();
}

export function canApplyToJob(user?: CreditUser | null): boolean {
  if (!user || user.role !== 'fixer') return false;
  if (user.banned) return false;

  if (isActivePro(user.plan)) return true;

  const creditsUsed = user.plan?.creditsUsed ?? 0;
  return creditsUsed < FREE_FIXER_CREDIT_LIMIT;
}

export function getRemainingApplications(user?: CreditUser | null): number | 'unlimited' {
  if (!user || user.role !== 'fixer') return 0;
  if (user.banned) return 0;

  if (isActivePro(user.plan)) return 'unlimited';

  const creditsUsed = user.plan?.creditsUsed ?? 0;
  return Math.max(0, FREE_FIXER_CREDIT_LIMIT - creditsUsed);
}

export function canPostJob(user?: CreditUser | null): boolean {
  if (!user || user.role !== 'hirer') return false;
  if (user.banned) return false;
  if (isActivePro(user.plan)) return true;
  if (!user.lastJobPostedAt) return true;

  const lastPosted = new Date(user.lastJobPostedAt);
  if (Number.isNaN(lastPosted.getTime())) return true;

  return Date.now() - lastPosted.getTime() >= HIRER_POST_INTERVAL_MS;
}

export function getNextJobPostTime(user?: CreditUser | null): Date | null {
  if (!user || user.role !== 'hirer') return null;
  if (user.banned) return null;
  if (isActivePro(user.plan)) return null;
  if (!user.lastJobPostedAt) return null;

  const lastPosted = new Date(user.lastJobPostedAt);
  if (Number.isNaN(lastPosted.getTime())) return null;

  const nextAllowedTime = new Date(lastPosted.getTime() + HIRER_POST_INTERVAL_MS);
  return Date.now() >= nextAllowedTime.getTime() ? null : nextAllowedTime;
}

export function getPlanStatus(user?: CreditUser | null): PlanStatusResult {
  if (!user?.plan) {
    return {
      type: 'free',
      status: 'active',
      isActive: true,
      isPro: false,
    };
  }

  const isActive = isActivePro(user.plan) || user.plan?.type === 'free';
  const isPro = user.plan.type === 'pro' && isActive;

  return {
    type: user.plan.type ?? 'free',
    status: user.plan.status ?? 'active',
    isActive,
    isPro,
    creditsUsed: user.plan.creditsUsed ?? 0,
    startDate: user.plan.startDate,
    endDate: user.plan.endDate,
  };
}

export function isSubscriptionActive(user?: CreditUser | null): boolean {
  return isActivePro(user?.plan);
}

export function isSubscriptionExpiringSoon(user?: CreditUser | null): boolean {
  if (!isActivePro(user?.plan) || !user?.plan?.endDate) {
    return false;
  }

  const endDate = new Date(user.plan.endDate);
  if (Number.isNaN(endDate.getTime())) {
    return false;
  }

  const diffMs = endDate.getTime() - Date.now();
  return diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
}

export function formatTimeRemaining(nextTime: Date | null | undefined): string {
  if (!nextTime) return '';

  const diff = nextTime.getTime() - Date.now();
  if (diff <= 0) return 'Now';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
