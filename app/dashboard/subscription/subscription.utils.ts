import { PLANS, type BillingPlanDefinition, type BillingRole } from '@/lib/services/billing/plans';

import type { BillingOption } from './subscription.types';

export function buildBillingOptions(role: BillingRole): BillingOption[] {
  return (Object.values(PLANS).filter((plan) => plan.role === role) as BillingPlanDefinition[])
    .sort((left, right) => left.amountRs - right.amountRs)
    .map((plan) => ({
      id: plan.id,
      cycle: plan.billingCycle,
      displayName: plan.displayName,
      price: plan.amountRs,
      description: plan.billingCycle === 'monthly' ? 'Billed every month' : 'Best value annual plan',
      features: plan.features,
    }));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
}

export function getStatusTone(status: string): string {
  switch (status) {
    case 'active':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'cancelled':
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'expired':
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-slate-700 bg-slate-50 border-slate-200';
  }
}
