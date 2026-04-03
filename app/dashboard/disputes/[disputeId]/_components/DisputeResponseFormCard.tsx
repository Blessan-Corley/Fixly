'use client';

import { Loader, Send } from 'lucide-react';

import type {
  ResponseAcknowledgement,
  ResponseFormData,
} from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

type DisputeResponseFormCardProps = {
  responseData: ResponseFormData;
  submittingResponse: boolean;
  onChange: (updater: (prev: ResponseFormData) => ResponseFormData) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function DisputeResponseFormCard({
  responseData,
  submittingResponse,
  onChange,
  onCancel,
  onSubmit,
}: DisputeResponseFormCardProps): React.JSX.Element {
  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-semibold text-fixly-text">Submit Response</h2>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">Your Response *</label>
          <textarea
            value={responseData.content}
            onChange={(e) => onChange((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="Provide your response to this dispute..."
            className="input-field"
            rows={5}
            maxLength={2000}
            required
          />
          <p className="mt-1 text-xs text-fixly-text-light">
            {responseData.content.length}/2000 characters
          </p>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-fixly-text">
            How do you respond to this dispute? *
          </label>
          <div className="space-y-3">
            {[
              ['acknowledge', 'Acknowledge', 'I acknowledge the validity of this dispute and agree to the proposed resolution'],
              ['dispute', 'Dispute', 'I dispute these claims and request mediation to resolve this matter'],
              ['counter_claim', 'Counter Claim', 'I dispute these claims and have my own counter claim to make'],
            ].map(([value, title, description]) => (
              <label
                key={value}
                className="flex cursor-pointer items-start space-x-3 rounded-lg border border-fixly-border p-3 hover:border-fixly-accent"
              >
                <input
                  type="radio"
                  name="acknowledgement"
                  value={value}
                  checked={responseData.acknowledgement === value}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      acknowledgement: e.target.value as ResponseAcknowledgement,
                    }))
                  }
                  className="mt-1"
                />
                <div>
                  <h4 className="font-medium text-fixly-text">{title}</h4>
                  <p className="text-sm text-fixly-text-light">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {responseData.acknowledgement === 'counter_claim' && (
          <div className="space-y-4 rounded-lg bg-fixly-bg p-4">
            <h4 className="font-medium text-fixly-text">Counter Claim Details</h4>
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Counter Claim Category
              </label>
              <input
                type="text"
                value={responseData.counterClaim.category}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    counterClaim: { ...prev.counterClaim, category: e.target.value },
                  }))
                }
                placeholder="e.g., Payment Issue"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Description</label>
              <textarea
                value={responseData.counterClaim.description}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    counterClaim: { ...prev.counterClaim, description: e.target.value },
                  }))
                }
                placeholder="Describe your counter claim..."
                className="input-field"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-fixly-text">
                  Desired Outcome
                </label>
                <input
                  type="text"
                  value={responseData.counterClaim.desiredOutcome}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      counterClaim: { ...prev.counterClaim, desiredOutcome: e.target.value },
                    }))
                  }
                  placeholder="What resolution do you seek?"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-fixly-text">
                  Amount (Rs)
                </label>
                <input
                  type="number"
                  value={responseData.counterClaim.amount}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      counterClaim: { ...prev.counterClaim, amount: e.target.value },
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
        )}

        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submittingResponse || !responseData.content.trim()}
            className="btn-primary flex items-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submittingResponse ? (
              <Loader className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            {submittingResponse ? 'Submitting...' : 'Submit Response'}
          </button>
        </div>
      </div>
    </div>
  );
}
