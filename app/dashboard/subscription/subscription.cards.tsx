'use client';

import { Loader } from 'lucide-react';

import type { FixerSubscriptionData, HirerSubscriptionData } from '@/hooks/query/subscription';

import { formatDate, getStatusTone } from './subscription.utils';

type CurrentPlan = (FixerSubscriptionData | HirerSubscriptionData)['plan'];
type CurrentEligibility = (FixerSubscriptionData | HirerSubscriptionData)['eligibility'];

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-fixly-bg p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-fixly-text-muted">{label}</div>
      <div className="mt-2 text-lg font-semibold text-fixly-text">{value}</div>
    </div>
  );
}

export function EligibilityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-fixly-bg px-3 py-2">
      <span className="text-fixly-text-muted">{label}</span>
      <span className="font-medium text-fixly-text">{value}</span>
    </div>
  );
}

export function CurrentPlanCard({
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
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(currentPlan.status)}`}
          >
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
              value={
                currentPlan.daysRemaining === null
                  ? 'Unlimited'
                  : String(currentPlan.daysRemaining)
              }
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fixly-text-muted">
              Included features
            </h3>
            <ul className="grid gap-2 md:grid-cols-2">
              {currentPlan.features.map((feature) => (
                <li
                  key={feature}
                  className="rounded-lg bg-fixly-bg px-3 py-2 text-sm text-fixly-text"
                >
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

export function EligibilityCard({
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
              <EligibilityRow
                label="Can post jobs"
                value={currentEligibility.canPostJobs ? 'Yes' : 'No'}
              />
              <EligibilityRow
                label="Job posts remaining"
                value={
                  currentEligibility.jobPostsRemaining === null
                    ? 'Unlimited'
                    : String(currentEligibility.jobPostsRemaining)
                }
              />
              <EligibilityRow
                label="Max active jobs"
                value={String(currentEligibility.maxActiveJobs)}
              />
              <EligibilityRow
                label="Can boost jobs"
                value={currentEligibility.canBoostJobs ? 'Yes' : 'No'}
              />
            </>
          ) : (
            <>
              <EligibilityRow
                label="Can apply to jobs"
                value={currentEligibility.canApplyToJobs ? 'Yes' : 'No'}
              />
              <EligibilityRow
                label="Can receive messages"
                value={currentEligibility.canReceiveMessages ? 'Yes' : 'No'}
              />
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
