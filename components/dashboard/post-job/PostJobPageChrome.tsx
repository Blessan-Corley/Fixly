'use client';

import { AlertTriangle, CheckCircle, ChevronRight, Clock, Loader } from 'lucide-react';
import { type ReactNode } from 'react';

import type { FormErrors, SubscriptionInfo } from '../../../types/jobs/post-job';

export { PostJobDraftHeader } from './PostJobDraftHeader';

interface PostJobProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function PostJobProgressBar({
  currentStep,
  totalSteps,
}: PostJobProgressBarProps): JSX.Element {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
              currentStep >= step
                ? 'bg-fixly-accent text-fixly-text'
                : 'bg-fixly-border text-fixly-text-muted'
            }`}
          >
            {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
          </div>
        ))}
      </div>
      <div className="h-2 rounded-full bg-fixly-border">
        <div
          className="h-full rounded-full bg-fixly-accent transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

interface PostJobValidationSummaryProps {
  errors: FormErrors;
  getFieldLabel: (field: string) => string;
}

export function PostJobValidationSummary({
  errors,
  getFieldLabel,
}: PostJobValidationSummaryProps): JSX.Element | null {
  if (Object.keys(errors).length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
            Please fix the following issues:
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>
                  <strong>{getFieldLabel(field)}:</strong> {message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PostJobNavigationProps {
  currentStep: number;
  totalSteps: number;
  loading: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
}

export function PostJobNavigation({
  currentStep,
  totalSteps,
  loading,
  onNext,
  onPrevious,
  onSubmit,
}: PostJobNavigationProps): JSX.Element {
  return (
    <div className="mt-8 flex justify-between">
      {currentStep > 1 && (
        <button type="button" onClick={onPrevious} className="btn-ghost flex items-center">
          Previous
        </button>
      )}

      <div className="ml-auto">
        {currentStep < totalSteps ? (
          <button type="button" onClick={onNext} className="btn-primary flex items-center">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="btn-primary flex items-center"
          >
            {loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            Post Job
          </button>
        )}
      </div>
    </div>
  );
}

interface PostJobSubscriptionBannerProps {
  onUpgrade: () => void;
  subscriptionInfo: SubscriptionInfo | null;
}

export function PostJobSubscriptionBanner({
  onUpgrade,
  subscriptionInfo,
}: PostJobSubscriptionBannerProps): JSX.Element | null {
  if (!subscriptionInfo || subscriptionInfo.plan.isActive || subscriptionInfo.eligibility.canPostJobs) {
    return null;
  }

  return (
    <div className="card mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
      <div className="flex items-center text-yellow-800 dark:text-yellow-400">
        <Clock className="mr-3 h-5 w-5" />
        <div className="flex-1">
          <p className="font-medium">Job posting limit reached</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {subscriptionInfo.eligibility.jobPostsRemaining === 0
              ? 'Upgrade to Pro for uninterrupted posting access'
              : 'Upgrade to Pro for unlimited posting'}
          </p>
        </div>
        <button type="button" onClick={onUpgrade} className="btn-primary ml-4">
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}

interface PostJobCardSectionProps {
  children: ReactNode;
}

export function PostJobCardSection({ children }: PostJobCardSectionProps): JSX.Element {
  return <div className="card min-h-[500px]">{children}</div>;
}
