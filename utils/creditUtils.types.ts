export type UserRole = 'hirer' | 'fixer' | string;
export type PlanType = 'free' | 'pro' | string;
export type PlanStatus = 'active' | 'expired' | 'cancelled' | 'none' | string;

export interface UserPlan {
  type?: PlanType;
  status?: PlanStatus;
  creditsUsed?: number;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface CreditUser {
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

export const FREE_FIXER_CREDIT_LIMIT = 3;
export const HIRER_POST_INTERVAL_MS = 4 * 60 * 60 * 1000;

export function isActivePro(plan?: UserPlan): boolean {
  if (plan?.type !== 'pro' || plan.status !== 'active') {
    return false;
  }

  if (!plan.endDate) {
    return true;
  }

  const endDate = new Date(plan.endDate);
  return !Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now();
}
