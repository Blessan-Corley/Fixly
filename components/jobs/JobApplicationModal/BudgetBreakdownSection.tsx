'use client';

import type { Dispatch, SetStateAction } from 'react';

import type { JobApplicationFormData } from '../../../app/dashboard/jobs/[jobId]/page.helpers';
import type { JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

type BudgetBreakdownSectionProps = {
  applicationData: JobApplicationFormData;
  setApplicationData: Dispatch<SetStateAction<JobApplicationFormData>>;
  materialsIncluded: JobDetails['budget']['materialsIncluded'];
};

const computeTotal = (bd: JobApplicationFormData['budgetBreakdown']): number =>
  (parseFloat(bd.laborCost) || 0) +
  (parseFloat(bd.materialsCost) || 0) +
  (parseFloat(bd.serviceFee) || 0);

export default function BudgetBreakdownSection({
  applicationData,
  setApplicationData,
  materialsIncluded,
}: BudgetBreakdownSectionProps) {
  const { budgetBreakdown } = applicationData;

  const handleCostChange = (field: 'laborCost' | 'materialsCost' | 'serviceFee', value: string) => {
    const newBreakdown = { ...budgetBreakdown, [field]: value };
    const total = computeTotal(newBreakdown);
    setApplicationData((prev) => ({
      ...prev,
      budgetBreakdown: newBreakdown,
      proposedAmount: total.toString(),
    }));
  };

  return (
    <div className="rounded-xl border border-fixly-border bg-fixly-bg-secondary/30 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h4 className="mb-1 font-semibold text-fixly-text">Budget Breakdown</h4>
          <p className="text-sm text-fixly-text-muted">
            Optional detailed cost breakdown for transparency
          </p>
        </div>
        <label className="ml-4 flex cursor-pointer items-center space-x-3">
          <input
            type="checkbox"
            checked={budgetBreakdown.enabled}
            onChange={(e) =>
              setApplicationData((prev) => ({
                ...prev,
                budgetBreakdown: { ...prev.budgetBreakdown, enabled: e.target.checked },
              }))
            }
            className="h-4 w-4 rounded border-fixly-border text-fixly-accent focus:border-fixly-accent focus:ring-fixly-accent"
          />
          <span className="text-sm font-medium text-fixly-text">Enable</span>
        </label>
      </div>

      {!budgetBreakdown.enabled ? (
        <div className="rounded-lg border border-fixly-accent/20 bg-fixly-accent-bg/50 p-4">
          <p className="text-sm leading-relaxed text-fixly-text-muted">
            <strong>Pro tip:</strong> Breaking down your costs helps clients understand your pricing
            and builds trust. Include labor costs, materials, and any service fees.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Labor Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-fixly-text-muted">
                  Rs
                </span>
                <input
                  type="number"
                  value={budgetBreakdown.laborCost}
                  onChange={(e) => handleCostChange('laborCost', e.target.value)}
                  className="input pl-8"
                  placeholder="Your work charges"
                />
              </div>
            </div>

            {!materialsIncluded && (
              <div>
                <label className="mb-2 block text-sm font-medium text-fixly-text">
                  Materials Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-fixly-text-muted">
                    Rs
                  </span>
                  <input
                    type="number"
                    value={budgetBreakdown.materialsCost}
                    onChange={(e) => handleCostChange('materialsCost', e.target.value)}
                    className="input pl-8"
                    placeholder="Material expenses"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Service Fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-fixly-text-muted">
                  Rs
                </span>
                <input
                  type="number"
                  value={budgetBreakdown.serviceFee}
                  onChange={(e) => handleCostChange('serviceFee', e.target.value)}
                  className="input pl-8"
                  placeholder="Additional charges"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-fixly-accent/20 bg-fixly-accent/10 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-fixly-accent">Calculated Total:</span>
              <span className="text-lg font-semibold text-fixly-accent">
                Rs {computeTotal(budgetBreakdown).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-fixly-accent/70">
              This amount will be used as your proposed total above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
