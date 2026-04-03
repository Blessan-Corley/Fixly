'use client';

import type { JobApplicationFormData } from '../../../app/dashboard/jobs/[jobId]/page.helpers';
import type { JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

type ProposalSummaryProps = {
  applicationData: JobApplicationFormData;
  materialsIncluded: JobDetails['budget']['materialsIncluded'];
};

export default function ProposalSummary({ applicationData, materialsIncluded }: ProposalSummaryProps) {
  const { budgetBreakdown, proposedAmount, materialsList, timeEstimate } = applicationData;

  return (
    <div className="rounded-lg bg-fixly-bg p-4">
      <h4 className="mb-3 font-medium text-fixly-text">Proposal Summary</h4>
      <div className="space-y-2 text-sm">
        {budgetBreakdown.enabled ? (
          <>
            {budgetBreakdown.laborCost && (
              <div className="flex justify-between">
                <span>Labor Cost:</span>
                <span className="font-medium">
                  Rs {parseFloat(budgetBreakdown.laborCost).toLocaleString()}
                </span>
              </div>
            )}
            {budgetBreakdown.materialsCost && !materialsIncluded && (
              <div className="flex justify-between">
                <span>Materials Cost:</span>
                <span className="font-medium">
                  Rs {parseFloat(budgetBreakdown.materialsCost).toLocaleString()}
                </span>
              </div>
            )}
            {materialsIncluded && (
              <div className="flex justify-between text-green-600">
                <span>Materials:</span>
                <span>Provided by hirer</span>
              </div>
            )}
            {budgetBreakdown.serviceFee && (
              <div className="flex justify-between">
                <span>Service Fee:</span>
                <span className="font-medium">
                  Rs {parseFloat(budgetBreakdown.serviceFee).toLocaleString()}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span>Service Charge:</span>
              <span className="font-medium">
                Rs {parseInt(proposedAmount || '0', 10).toLocaleString()}
              </span>
            </div>
            {materialsIncluded && (
              <div className="flex justify-between text-green-600">
                <span>Materials:</span>
                <span>Provided by hirer</span>
              </div>
            )}
            {materialsList.length > 0 && !materialsIncluded && (
              <div className="flex justify-between">
                <span>Additional Materials:</span>
                <span>
                  Rs{' '}
                  {materialsList
                    .reduce((total, material) => total + Number(material.estimatedCost || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}

        <hr className="my-2" />

        <div className="flex justify-between text-base font-semibold">
          <span>Total Estimate:</span>
          <span className="text-fixly-accent">
            Rs {parseInt(proposedAmount || '0', 10).toLocaleString()}
          </span>
        </div>

        <div className="mt-2 text-xs text-fixly-text-muted">
          <p>
            • Price includes:{' '}
            {materialsIncluded
              ? 'Service (materials provided by hirer)'
              : budgetBreakdown.enabled && budgetBreakdown.materialsCost
                ? 'Service + Materials'
                : 'Service only'}
          </p>
          {timeEstimate.value && (
            <p>
              • Estimated time: {timeEstimate.value} {timeEstimate.unit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
