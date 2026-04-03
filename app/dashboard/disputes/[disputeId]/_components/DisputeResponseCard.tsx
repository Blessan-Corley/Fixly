'use client';

import { User } from 'lucide-react';

import { formatCurrency, formatDateTime } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.helpers';
import type { DisputeParty, DisputeResponse } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

type DisputeResponseCardProps = {
  response: DisputeResponse;
  responder: DisputeParty;
};

export function DisputeResponseCard({
  response,
  responder,
}: DisputeResponseCardProps): React.JSX.Element {
  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-semibold text-fixly-text">Response</h2>
      <div className="space-y-4">
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fixly-accent-light">
            <User className="h-4 w-4 text-fixly-accent" />
          </div>
          <div>
            <h3 className="font-medium text-fixly-text">{responder.name}</h3>
            <p className="text-sm text-fixly-text-light">{formatDateTime(response.respondedAt)}</p>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              response.acknowledgement === 'acknowledge'
                ? 'bg-green-100 text-green-800'
                : response.acknowledgement === 'counter_claim'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-orange-100 text-orange-800'
            }`}
          >
            {response.acknowledgement.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="rounded-lg bg-fixly-bg p-4">
          <p className="text-fixly-text-light">{response.content}</p>
        </div>

        {response.counterClaim && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="mb-2 font-medium text-red-800">Counter Claim</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Category:</strong> {response.counterClaim.category}</p>
              <p><strong>Description:</strong> {response.counterClaim.description}</p>
              <p><strong>Desired Outcome:</strong> {response.counterClaim.desiredOutcome}</p>
              {response.counterClaim.amount && (
                <p><strong>Amount:</strong> {formatCurrency(response.counterClaim.amount)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
