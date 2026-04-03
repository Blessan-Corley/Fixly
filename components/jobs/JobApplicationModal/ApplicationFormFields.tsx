'use client';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import type { JobApplicationFormData } from '../../../app/dashboard/jobs/[jobId]/page.helpers';

export { WorkPlanSection, CoverLetterSection, RequirementsNotesSection } from './ApplicationFormExtras';

type SetData = Dispatch<SetStateAction<JobApplicationFormData>>;

// ─── ProposedAmountSection ────────────────────────────────────────────────────

type ProposedAmountSectionProps = {
  applicationData: JobApplicationFormData;
  setApplicationData: SetData;
  budget: {
    type?: string;
    amount?: number;
    materialsIncluded?: boolean;
  };
};

export function ProposedAmountSection({
  applicationData,
  setApplicationData,
  budget,
}: ProposedAmountSectionProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-fixly-border/50 bg-fixly-bg-secondary/20 p-4">
      <label className="mb-3 block flex flex-wrap items-center text-sm font-semibold text-fixly-text">
        <DollarSign className="mr-2 h-4 w-4 text-fixly-accent" />
        Your Proposed Amount *
        {budget.type === 'negotiable' && (
          <span className="ml-2 rounded-full bg-fixly-success-bg px-2 py-1 text-xs text-fixly-success">
            Negotiable - Propose your price
          </span>
        )}
        {budget.type === 'fixed' && (
          <span className="ml-2 rounded-full bg-fixly-info-bg px-2 py-1 text-xs text-fixly-info">
            Fixed - Match or propose alternative
          </span>
        )}
        {budget.type === 'hourly' && (
          <span className="ml-2 rounded-full bg-fixly-accent-bg px-2 py-1 text-xs text-fixly-accent">
            Hourly - Your rate per hour
          </span>
        )}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 transform font-semibold text-fixly-accent">
          Rs
        </span>
        <input
          type="number"
          value={applicationData.proposedAmount}
          onChange={(e) =>
            setApplicationData((prev) => ({ ...prev, proposedAmount: e.target.value }))
          }
          className="input-field pl-10 text-lg font-semibold text-fixly-accent"
          placeholder={
            budget.type === 'negotiable'
              ? 'Enter your price'
              : budget.type === 'hourly'
                ? 'Your hourly rate'
                : budget.amount?.toString()
          }
          min="100"
          max="1000000"
          required
        />
      </div>
      {budget.type === 'fixed' && budget.amount && (
        <p className="mt-1 text-xs text-fixly-text-muted">
          Client&apos;s budget: Rs {budget.amount.toLocaleString()}
          {parseInt(applicationData.proposedAmount || '0', 10) !== budget.amount &&
            applicationData.proposedAmount && (
              <span className="ml-2 font-medium text-fixly-warning">
                (Your proposal: Rs{' '}
                {parseInt(applicationData.proposedAmount, 10).toLocaleString()})
              </span>
            )}
        </p>
      )}
    </div>
  );
}

// ─── MaterialsBannerSection ───────────────────────────────────────────────────

export function MaterialsBannerSection({
  materialsIncluded,
}: {
  materialsIncluded?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border-2 p-4 ${
        materialsIncluded
          ? 'border-fixly-success/30 bg-fixly-success-bg dark:bg-fixly-success/10'
          : 'border-fixly-warning/30 bg-fixly-warning-bg dark:bg-fixly-warning/10'
      }`}
    >
      <div className="flex items-start">
        <div
          className={`mr-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
            materialsIncluded ? 'bg-fixly-success' : 'bg-fixly-warning'
          }`}
        >
          {materialsIncluded ? (
            <CheckCircle className="h-4 w-4 text-white" />
          ) : (
            <AlertCircle className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="flex-1">
          <h4
            className={`mb-2 text-sm font-semibold ${
              materialsIncluded ? 'text-fixly-success-text' : 'text-fixly-warning-text'
            }`}
          >
            {materialsIncluded ? 'Materials Provided by Hirer' : 'Materials Not Provided'}
          </h4>
          <p
            className={`text-sm leading-relaxed ${
              materialsIncluded ? 'text-fixly-success-text/80' : 'text-fixly-warning-text/80'
            }`}
          >
            {materialsIncluded
              ? 'The hirer will provide all required materials. Coordinate collection after acceptance.'
              : "You'll need to arrange materials. Include material costs in the breakdown above before starting."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── TimeEstimateSection ──────────────────────────────────────────────────────

export function TimeEstimateSection({
  applicationData,
  setApplicationData,
}: {
  applicationData: JobApplicationFormData;
  setApplicationData: SetData;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-fixly-border/50 bg-fixly-bg-secondary/20 p-4">
      <label className="mb-3 block flex items-center text-sm font-semibold text-fixly-text">
        <Clock className="mr-2 h-4 w-4 text-fixly-accent" />
        Time Estimate
      </label>
      <div className="flex space-x-3">
        <input
          type="number"
          value={applicationData.timeEstimate.value}
          onChange={(e) =>
            setApplicationData((prev) => ({
              ...prev,
              timeEstimate: { ...prev.timeEstimate, value: e.target.value },
            }))
          }
          className="input-field flex-1"
          placeholder="Duration"
          min="1"
        />
        <select
          value={applicationData.timeEstimate.unit}
          onChange={(e) =>
            setApplicationData((prev) => ({
              ...prev,
              timeEstimate: { ...prev.timeEstimate, unit: e.target.value },
            }))
          }
          className="input-field w-28"
        >
          <option value="hours">Hours</option>
          <option value="days">Days</option>
          <option value="weeks">Weeks</option>
        </select>
      </div>
    </div>
  );
}

