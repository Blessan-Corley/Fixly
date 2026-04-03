import type { IUser } from '@/types/User';

import {
  FREE_FIXER_FEATURES,
  FREE_HIRER_FEATURES,
  PLANS,
  type BillingPlanDefinition,
  type BillingRole,
} from './plans';

export type SubscriptionPlanSnapshot = {
  type: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  daysRemaining: number | null;
  features: string[];
};

export type FixerEligibility = {
  canApplyToJobs: boolean;
  canReceiveMessages: boolean;
  applicationCreditsRemaining: number | null;
  maxActiveApplications: number;
};

export type HirerEligibility = {
  canPostJobs: boolean;
  jobPostsRemaining: number | null;
  maxActiveJobs: number;
  canBoostJobs: boolean;
};

function getPlanEndDate(user: Pick<IUser, 'plan'>): Date | null {
  const rawEndDate = user.plan?.endDate ?? user.plan?.expiresAt;
  return rawEndDate ? new Date(rawEndDate) : null;
}

export function isSubscriptionActive(user: Pick<IUser, 'plan'>): boolean {
  if (user.plan?.type !== 'pro' || user.plan?.status !== 'active') {
    return false;
  }

  const endDate = getPlanEndDate(user);
  if (!endDate) {
    return true;
  }

  return endDate.getTime() > Date.now();
}

function getDaysRemaining(endDate: Date | null): number | null {
  if (!endDate) {
    return null;
  }

  const diffMs = endDate.getTime() - Date.now();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function getActivePaidPlanDefinition(
  user: Pick<IUser, 'role' | 'plan'>
): BillingPlanDefinition | null {
  if (!isSubscriptionActive(user) || (user.role !== 'fixer' && user.role !== 'hirer')) {
    return null;
  }

  const billingCycle = user.plan?.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const planKey = `${user.role}_${billingCycle}` as keyof typeof PLANS;
  return PLANS[planKey] ?? null;
}

export function getPlanSnapshot(user: Pick<IUser, 'role' | 'plan'>): SubscriptionPlanSnapshot {
  const endDate = getPlanEndDate(user);
  const activePlan = getActivePaidPlanDefinition(user);

  return {
    type: user.plan?.type ?? 'free',
    status: user.plan?.status ?? 'none',
    startDate: user.plan?.startDate ? new Date(user.plan.startDate) : null,
    endDate,
    isActive: Boolean(activePlan),
    daysRemaining: getDaysRemaining(endDate),
    features:
      activePlan?.features ??
      (user.role === 'fixer' ? FREE_FIXER_FEATURES.slice() : FREE_HIRER_FEATURES.slice()),
  };
}

export function getFixerSubscriptionStatus(
  user: Pick<IUser, 'role' | 'plan'>
): { plan: SubscriptionPlanSnapshot; eligibility: FixerEligibility } {
  const plan = getPlanSnapshot(user);
  const creditsUsed = user.plan?.creditsUsed ?? 0;
  const applicationCreditsRemaining = plan.isActive ? null : Math.max(0, 3 - creditsUsed);
  const maxActiveApplications = plan.isActive
    ? (getActivePaidPlanDefinition(user)?.maxActiveApplications ?? 1000)
    : 3;

  return {
    plan,
    eligibility: {
      canApplyToJobs: plan.isActive || (applicationCreditsRemaining ?? 0) > 0,
      canReceiveMessages: true,
      applicationCreditsRemaining,
      maxActiveApplications,
    },
  };
}

export function getHirerSubscriptionStatus(
  user: Pick<IUser, 'role' | 'plan' | 'lastJobPostedAt'>
): { plan: SubscriptionPlanSnapshot; eligibility: HirerEligibility } {
  const plan = getPlanSnapshot(user);
  const nextAllowedTime =
    user.lastJobPostedAt && !plan.isActive
      ? new Date(new Date(user.lastJobPostedAt).getTime() + 4 * 60 * 60 * 1000)
      : null;
  const canPostJobs =
    plan.isActive || !nextAllowedTime || nextAllowedTime.getTime() <= Date.now();
  const activePlan = getActivePaidPlanDefinition(user);

  return {
    plan,
    eligibility: {
      canPostJobs,
      jobPostsRemaining: plan.isActive ? null : 1,
      maxActiveJobs: activePlan?.maxActiveJobs ?? 1,
      canBoostJobs: plan.isActive && user.role === 'hirer',
    },
  };
}

export function getEntitlementStatus(user: Pick<IUser, 'role' | 'plan'>): {
  isActive: boolean;
  planType: string;
  expiresAt: Date | null;
  features: string[];
} {
  const plan = getPlanSnapshot(user);

  return {
    isActive: plan.isActive,
    planType: plan.type,
    expiresAt: plan.endDate,
    features: plan.features,
  };
}

export function roleSupportsPaidPlan(role: string | undefined): role is BillingRole {
  return role === 'hirer' || role === 'fixer';
}
