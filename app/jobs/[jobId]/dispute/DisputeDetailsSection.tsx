'use client';

import type { DisputeFormData } from './dispute.types';

type DisputeDetailsSectionProps = {
  title: string;
  description: string;
  setDisputeData: (updater: (prev: DisputeFormData) => DisputeFormData) => void;
};

export default function DisputeDetailsSection({
  title,
  description,
  setDisputeData,
}: DisputeDetailsSectionProps) {
  return (
    <div className="card">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Dispute Details</h3>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Dispute Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(event) =>
              setDisputeData((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Brief summary of the issue"
            className="input-field"
            maxLength={150}
            required
          />
          <p className="mt-1 text-xs text-fixly-text-light">{title.length}/150 characters</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Detailed Description *
          </label>
          <textarea
            value={description}
            onChange={(event) =>
              setDisputeData((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Provide a detailed explanation of the issue, including what happened, when it occurred, and any relevant context..."
            className="input-field"
            rows={6}
            maxLength={2000}
            required
          />
          <p className="mt-1 text-xs text-fixly-text-light">
            {description.length}/2000 characters
          </p>
        </div>
      </div>
    </div>
  );
}
