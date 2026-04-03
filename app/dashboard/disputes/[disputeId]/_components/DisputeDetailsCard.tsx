'use client';

import { formatCurrency } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.helpers';
import type { DisputeDetail } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

export function DisputeDetailsCard({ dispute }: { dispute: DisputeDetail }): React.JSX.Element {
  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-semibold text-fixly-text">Dispute Details</h2>
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-medium text-fixly-text">Description</h3>
          <p className="leading-relaxed text-fixly-text-light">{dispute.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-fixly-text">Category</h3>
            <p className="capitalize text-fixly-text-light">
              {dispute.category.replace(/_/g, ' ')}
              {dispute.subcategory && ` - ${dispute.subcategory}`}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-fixly-text">Desired Outcome</h3>
            <p className="capitalize text-fixly-text-light">
              {dispute.desiredOutcome.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {dispute.desiredOutcomeDetails && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-fixly-text">Additional Details</h3>
            <p className="text-fixly-text-light">{dispute.desiredOutcomeDetails}</p>
          </div>
        )}

        {(dispute.amount.disputedAmount ||
          dispute.amount.refundRequested ||
          dispute.amount.additionalPaymentRequested) && (
          <div className="grid grid-cols-1 gap-4 border-t border-fixly-border pt-4 md:grid-cols-3">
            {dispute.amount.disputedAmount && (
              <div>
                <h3 className="mb-1 text-sm font-medium text-fixly-text">Disputed Amount</h3>
                <p className="text-lg font-semibold text-fixly-text">
                  {formatCurrency(dispute.amount.disputedAmount)}
                </p>
              </div>
            )}
            {dispute.amount.refundRequested && (
              <div>
                <h3 className="mb-1 text-sm font-medium text-fixly-text">Refund Requested</h3>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(dispute.amount.refundRequested)}
                </p>
              </div>
            )}
            {dispute.amount.additionalPaymentRequested && (
              <div>
                <h3 className="mb-1 text-sm font-medium text-fixly-text">Additional Payment</h3>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(dispute.amount.additionalPaymentRequested)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
