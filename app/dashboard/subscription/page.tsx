'use client';

import { AlertCircle, CheckCircle2, Crown, RefreshCcw } from 'lucide-react';

import type { BillingRole } from '@/lib/services/billing/plans';

import { RoleGuard, useApp } from '../../providers';
import type { AppUser } from '../../providers';

import { CurrentPlanCard, EligibilityCard } from './subscription.cards';
import type { SubscriptionUser } from './subscription.types';
import SubscriptionPlanCard from './SubscriptionPlanCard';
import { useSubscriptionPage } from './useSubscriptionPage';

export default function SubscriptionPage() {
  return (
    <RoleGuard
      roles={['hirer', 'fixer']}
      fallback={<div className="p-8 text-center text-fixly-text-muted">Access denied</div>}
    >
      <SubscriptionPageContent />
    </RoleGuard>
  );
}

function SubscriptionPageContent() {
  const { user } = useApp();
  const subscriptionUser = user as (AppUser & SubscriptionUser) | null;
  const role =
    subscriptionUser?.role === 'hirer' || subscriptionUser?.role === 'fixer'
      ? subscriptionUser.role
      : null;

  if (!role) {
    return (
      <div className="p-8 text-center text-fixly-text-muted">Subscription data unavailable.</div>
    );
  }

  return <RoleSubscriptionPage role={role} />;
}

function RoleSubscriptionPage({ role }: { role: BillingRole }) {
  const {
    billingOptions,
    subscriptionQuery,
    subscriptionData,
    isCreatingOrder,
    verifyState,
    verifyMessage,
    handleCheckout,
  } = useSubscriptionPage(role);

  const currentPlan = subscriptionData?.plan;
  const currentEligibility = subscriptionData?.eligibility;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="mb-3 flex items-center gap-3">
          <Crown className="h-10 w-10 text-fixly-accent" />
          <div>
            <h1 className="text-3xl font-bold text-fixly-text">Your Plan</h1>
            <p className="text-fixly-text-muted">
              Manage billing and check eligibility for your {role} account.
            </p>
          </div>
        </div>

        {verifyState === 'verifying' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Activating your subscription...
            </div>
          </div>
        )}
      </div>

      {verifyState === 'success' && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Payment confirmed</p>
              <p className="text-sm">{verifyMessage}</p>
            </div>
          </div>
        </div>
      )}

      {verifyState === 'error' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Activation failed</p>
              <p className="text-sm">
                {verifyMessage ?? 'Payment verification failed. Please contact support.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <CurrentPlanCard isLoading={subscriptionQuery.isLoading} currentPlan={currentPlan} />
        <EligibilityCard
          isLoading={subscriptionQuery.isLoading}
          currentEligibility={currentEligibility}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {billingOptions.map((option) => (
          <SubscriptionPlanCard
            key={option.id}
            option={option}
            isCurrentActive={currentPlan?.isActive}
            isCreatingOrder={isCreatingOrder}
            onCheckout={handleCheckout}
          />
        ))}
      </div>

      <div className="mt-8 text-sm text-fixly-text-muted">
        Payments are processed securely via Razorpay. Your subscription is activated immediately
        after a successful payment. If you face any issues, please contact support.
      </div>
    </div>
  );
}
