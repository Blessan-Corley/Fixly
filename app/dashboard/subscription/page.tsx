'use client';

import { AlertCircle, CheckCircle2, Crown, Loader, RefreshCcw } from 'lucide-react';

import type { FixerSubscriptionData, HirerSubscriptionData } from '@/hooks/query/subscription';
import type { BillingRole } from '@/lib/services/billing/plans';

import { RoleGuard, useApp } from '../../providers';
import type { AppUser } from '../../providers';

import type { SubscriptionUser } from './subscription.types';
import { formatDate, getStatusTone } from './subscription.utils';
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
    return <div className="p-8 text-center text-fixly-text-muted">Subscription data unavailable.</div>;
  }

  return <RoleSubscriptionPage role={role} />;
}

function RoleSubscriptionPage({ role }: { role: BillingRole }) {
  const {
    billingOptions,
    subscriptionQuery,
    subscriptionData,
    verifyPaymentQuery,
    isCreatingOrder,
    pollCount,
    handleCheckout,
  } = useSubscriptionPage(role);

  const verificationState = verifyPaymentQuery.data?.status;
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

        {verificationState === 'pending' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Activating your subscription...
            </div>
          </div>
        )}
      </div>

      {verifyPaymentQuery.data?.status === 'processed' && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Payment confirmed</p>
              <p className="text-sm">{verifyPaymentQuery.data.message}</p>
            </div>
          </div>
        </div>
      )}

      {verifyPaymentQuery.data?.status === 'pending' && pollCount >= 10 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Activation still in progress</p>
              <p className="text-sm">
                Payment was received. Your subscription will activate shortly once the webhook finishes processing.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <CurrentPlanCard
          isLoading={subscriptionQuery.isLoading}
          currentPlan={currentPlan}
        />
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
        Payments are confirmed by Stripe webhook. If you complete checkout and this page still shows
        pending activation, do not retry payment. The subscription will activate automatically once
        the webhook finishes.
      </div>
    </div>
  );
}

type CurrentPlan = (FixerSubscriptionData | HirerSubscriptionData)['plan'];

function CurrentPlanCard({
  isLoading,
  currentPlan,
}: {
  isLoading: boolean;
  currentPlan: CurrentPlan | undefined;
}) {
  return (
    <div className="rounded-2xl border border-fixly-border bg-fixly-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fixly-text">Current subscription</h2>
        {currentPlan && (
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(currentPlan.status)}`}>
            {currentPlan.status}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-fixly-text-muted">
          <Loader className="h-5 w-5 animate-spin" />
          Loading subscription status...
        </div>
      ) : currentPlan ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Plan" value={currentPlan.type} />
            <MetricCard label="Ends on" value={formatDate(currentPlan.endDate)} />
            <MetricCard
              label="Days remaining"
              value={currentPlan.daysRemaining === null ? 'Unlimited' : String(currentPlan.daysRemaining)}
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fixly-text-muted">
              Included features
            </h3>
            <ul className="grid gap-2 md:grid-cols-2">
              {currentPlan.features.map((feature) => (
                <li key={feature} className="rounded-lg bg-fixly-bg px-3 py-2 text-sm text-fixly-text">
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-fixly-text-muted">No plan data available.</p>
      )}
    </div>
  );
}

type CurrentEligibility =
  | (FixerSubscriptionData | HirerSubscriptionData)['eligibility'];

function EligibilityCard({
  isLoading,
  currentEligibility,
}: {
  isLoading: boolean;
  currentEligibility: CurrentEligibility | undefined;
}) {
  return (
    <div className="rounded-2xl border border-fixly-border bg-fixly-card p-6">
      <h2 className="mb-4 text-xl font-semibold text-fixly-text">Eligibility</h2>
      {isLoading ? (
        <div className="flex items-center gap-3 text-fixly-text-muted">
          <Loader className="h-5 w-5 animate-spin" />
          Loading eligibility...
        </div>
      ) : currentEligibility ? (
        <div className="space-y-3 text-sm text-fixly-text">
          {'canPostJobs' in currentEligibility ? (
            <>
              <EligibilityRow label="Can post jobs" value={currentEligibility.canPostJobs ? 'Yes' : 'No'} />
              <EligibilityRow
                label="Job posts remaining"
                value={currentEligibility.jobPostsRemaining === null ? 'Unlimited' : String(currentEligibility.jobPostsRemaining)}
              />
              <EligibilityRow label="Max active jobs" value={String(currentEligibility.maxActiveJobs)} />
              <EligibilityRow label="Can boost jobs" value={currentEligibility.canBoostJobs ? 'Yes' : 'No'} />
            </>
          ) : (
            <>
              <EligibilityRow label="Can apply to jobs" value={currentEligibility.canApplyToJobs ? 'Yes' : 'No'} />
              <EligibilityRow label="Can receive messages" value={currentEligibility.canReceiveMessages ? 'Yes' : 'No'} />
              <EligibilityRow
                label="Application credits remaining"
                value={
                  currentEligibility.applicationCreditsRemaining === null
                    ? 'Unlimited'
                    : String(currentEligibility.applicationCreditsRemaining)
                }
              />
              <EligibilityRow
                label="Max active applications"
                value={String(currentEligibility.maxActiveApplications)}
              />
            </>
          )}
        </div>
      ) : (
        <p className="text-fixly-text-muted">No eligibility data available.</p>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-fixly-bg p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-fixly-text-muted">{label}</div>
      <div className="mt-2 text-lg font-semibold text-fixly-text">{value}</div>
    </div>
  );
}

function EligibilityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-fixly-bg px-3 py-2">
      <span className="text-fixly-text-muted">{label}</span>
      <span className="font-medium text-fixly-text">{value}</span>
    </div>
  );
}
