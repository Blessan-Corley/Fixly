'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

import type { PlanId } from '@/lib/services/billing/plans';

import type { BillingOption } from './subscription.types';

type SubscriptionPlanCardProps = {
  option: BillingOption;
  isCurrentActive: boolean | undefined;
  isCreatingOrder: boolean;
  onCheckout: (planId: PlanId) => void;
};

export default function SubscriptionPlanCard({
  option,
  isCurrentActive,
  isCreatingOrder,
  onCheckout,
}: SubscriptionPlanCardProps) {
  return (
    <motion.div
      key={option.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-fixly-border bg-fixly-card p-6"
    >
      <div className="mb-4">
        <h3 className="text-2xl font-semibold text-fixly-text">{option.displayName}</h3>
        <p className="text-sm text-fixly-text-muted">{option.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-fixly-text">INR {option.price}</span>
        <span className="ml-2 text-fixly-text-muted">
          /{option.cycle === 'monthly' ? 'month' : 'year'}
        </span>
      </div>

      <ul className="mb-6 space-y-2 text-sm text-fixly-text">
        {option.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={isCreatingOrder || isCurrentActive}
        onClick={() => { onCheckout(option.id); }}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreatingOrder
          ? 'Starting checkout...'
          : isCurrentActive
            ? 'Current active plan'
            : `Upgrade to ${option.displayName}`}
      </button>
    </motion.div>
  );
}
