export type BillingRole = 'hirer' | 'fixer';
export type BillingCycle = 'monthly' | 'yearly';
export type PlanId =
  | 'fixer_monthly'
  | 'fixer_yearly'
  | 'hirer_monthly'
  | 'hirer_yearly';

export type BillingPlanDefinition = {
  id: PlanId;
  displayName: string;
  role: BillingRole;
  planType: 'pro';
  billingCycle: BillingCycle;
  durationDays: number;
  amountRs: number;
  features: string[];
  maxApplications: number | null;
  maxActiveApplications: number;
  maxJobs: number | null;
  maxActiveJobs: number;
  canBoostJobs: boolean;
};

export const PLANS: Record<PlanId, BillingPlanDefinition> = {
  fixer_monthly: {
    id: 'fixer_monthly',
    displayName: 'Fixer Pro Monthly',
    role: 'fixer',
    planType: 'pro',
    billingCycle: 'monthly',
    durationDays: 30,
    amountRs: 99,
    features: [
      'Unlimited job applications',
      'Priority listing',
      'Advanced analytics',
      'Profile boost',
      'Priority support',
      'Exclusive job alerts',
    ],
    maxApplications: null,
    maxActiveApplications: 1000,
    maxJobs: 0,
    maxActiveJobs: 0,
    canBoostJobs: false,
  },
  fixer_yearly: {
    id: 'fixer_yearly',
    displayName: 'Fixer Pro Yearly',
    role: 'fixer',
    planType: 'pro',
    billingCycle: 'yearly',
    durationDays: 365,
    amountRs: 999,
    features: [
      'Unlimited job applications',
      'Priority listing',
      'Advanced analytics',
      'Profile boost',
      'Priority support',
      'Exclusive job alerts',
    ],
    maxApplications: null,
    maxActiveApplications: 1000,
    maxJobs: 0,
    maxActiveJobs: 0,
    canBoostJobs: false,
  },
  hirer_monthly: {
    id: 'hirer_monthly',
    displayName: 'Hirer Pro Monthly',
    role: 'hirer',
    planType: 'pro',
    billingCycle: 'monthly',
    durationDays: 30,
    amountRs: 99,
    features: [
      'Unlimited job posts',
      'Job boosting',
      'Priority listing',
      'Priority support',
      'Advanced analytics',
    ],
    maxApplications: 0,
    maxActiveApplications: 0,
    maxJobs: null,
    maxActiveJobs: 1000,
    canBoostJobs: true,
  },
  hirer_yearly: {
    id: 'hirer_yearly',
    displayName: 'Hirer Pro Yearly',
    role: 'hirer',
    planType: 'pro',
    billingCycle: 'yearly',
    durationDays: 365,
    amountRs: 999,
    features: [
      'Unlimited job posts',
      'Job boosting',
      'Priority listing',
      'Priority support',
      'Advanced analytics',
    ],
    maxApplications: 0,
    maxActiveApplications: 0,
    maxJobs: null,
    maxActiveJobs: 1000,
    canBoostJobs: true,
  },
};

export const FREE_FIXER_FEATURES = ['3 applications per billing period', 'Standard support'];
export const FREE_HIRER_FEATURES = ['Standard job posting', 'Basic support'];

export function resolvePlanId(
  role: BillingRole,
  selection: string | null | undefined
): PlanId | null {
  if (!selection) {
    return null;
  }

  switch (`${role}:${selection}`) {
    case 'fixer:monthly':
    case 'fixer:fixer_monthly':
      return 'fixer_monthly';
    case 'fixer:yearly':
    case 'fixer:fixer_yearly':
      return 'fixer_yearly';
    case 'hirer:monthly':
    case 'hirer:hirer_monthly':
      return 'hirer_monthly';
    case 'hirer:yearly':
    case 'hirer:hirer_yearly':
      return 'hirer_yearly';
    default:
      return null;
  }
}

export function getPlanById(planId: PlanId): BillingPlanDefinition {
  return PLANS[planId];
}

export function roleSupportsPaidPlan(role: string | undefined): role is BillingRole {
  return role === 'hirer' || role === 'fixer';
}
