import type { PlanType, PlanStatus } from './primitives';

export interface UserPlan {
  type: PlanType;
  startDate?: Date;
  endDate?: Date;
  status: PlanStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  activatedAt?: Date;
  paymentId?: string;
  creditsUsed: number;
  subscribedAt?: Date;
  expiresAt?: Date;
  billingCycle?: 'monthly' | 'quarterly' | 'yearly';
  amount?: number;
  features?: string[];
  cancelledAt?: Date;
}

export interface UserPortfolioItem {
  title?: string;
  description?: string;
  images?: string[];
  links?: string[];
  [key: string]: unknown;
}
