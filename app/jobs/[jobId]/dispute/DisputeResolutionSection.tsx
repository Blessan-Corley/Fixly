'use client';

import type { DisputeFormData } from './dispute.types';
import { DESIRED_OUTCOMES } from './dispute.types';

type DisputeResolutionSectionProps = {
  desiredOutcome: string;
  desiredOutcomeDetails: string;
  disputedAmount: string;
  refundRequested: string;
  additionalPaymentRequested: string;
  setDisputeData: (updater: (prev: DisputeFormData) => DisputeFormData) => void;
};

export default function DisputeResolutionSection({
  desiredOutcome,
  desiredOutcomeDetails,
  disputedAmount,
  refundRequested,
  additionalPaymentRequested,
  setDisputeData,
}: DisputeResolutionSectionProps) {
  return (
    <div className="card">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Desired Resolution</h3>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-medium text-fixly-text">
            What outcome are you seeking? *
          </label>
          <div className="space-y-3">
            {DESIRED_OUTCOMES.map((outcome) => (
              <label
                key={outcome.value}
                className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors ${
                  desiredOutcome === outcome.value
                    ? 'border-fixly-accent bg-fixly-accent-light'
                    : 'border-fixly-border hover:border-fixly-accent-light'
                }`}
              >
                <input
                  type="radio"
                  name="desiredOutcome"
                  value={outcome.value}
                  checked={desiredOutcome === outcome.value}
                  onChange={(event) =>
                    setDisputeData((prev) => ({ ...prev, desiredOutcome: event.target.value }))
                  }
                  className="mt-1"
                  required
                />
                <div>
                  <h4 className="font-medium text-fixly-text">{outcome.label}</h4>
                  <p className="text-sm text-fixly-text-light">{outcome.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Additional Details
          </label>
          <textarea
            value={desiredOutcomeDetails}
            onChange={(event) =>
              setDisputeData((prev) => ({ ...prev, desiredOutcomeDetails: event.target.value }))
            }
            placeholder="Provide more details about your desired resolution..."
            className="input-field"
            rows={3}
            maxLength={1000}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">
              Disputed Amount (Rs.)
            </label>
            <input
              type="number"
              value={disputedAmount}
              onChange={(event) =>
                setDisputeData((prev) => ({ ...prev, disputedAmount: event.target.value }))
              }
              placeholder="0"
              className="input-field"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">
              Refund Requested (Rs.)
            </label>
            <input
              type="number"
              value={refundRequested}
              onChange={(event) =>
                setDisputeData((prev) => ({ ...prev, refundRequested: event.target.value }))
              }
              placeholder="0"
              className="input-field"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">
              Additional Payment (Rs.)
            </label>
            <input
              type="number"
              value={additionalPaymentRequested}
              onChange={(event) =>
                setDisputeData((prev) => ({
                  ...prev,
                  additionalPaymentRequested: event.target.value,
                }))
              }
              placeholder="0"
              className="input-field"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
