import type { BillingCycle, BillingRole, PlanId } from '@/lib/services/billing/plans';

import type { AppUser } from '../../providers';

export type SubscriptionUser = AppUser & {
  role?: BillingRole | 'admin';
};

export type BillingOption = {
  id: PlanId;
  cycle: BillingCycle;
  displayName: string;
  price: number;
  description: string;
  features: string[];
};
