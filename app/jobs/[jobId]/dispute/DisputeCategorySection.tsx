'use client';

import type { DisputeFormData } from './dispute.types';
import { DISPUTE_CATEGORIES } from './dispute.types';

type DisputeCategorySectionProps = {
  category: string;
  subcategory: string;
  setDisputeData: (updater: (prev: DisputeFormData) => DisputeFormData) => void;
};

export default function DisputeCategorySection({
  category,
  subcategory,
  setDisputeData,
}: DisputeCategorySectionProps) {
  return (
    <div className="card">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Dispute Category</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {DISPUTE_CATEGORIES.map((cat) => (
          <label
            key={cat.value}
            className={`cursor-pointer rounded-lg border p-4 transition-colors ${
              category === cat.value
                ? 'border-fixly-accent bg-fixly-accent-light'
                : 'border-fixly-border hover:border-fixly-accent-light'
            }`}
          >
            <input
              type="radio"
              name="category"
              value={cat.value}
              checked={category === cat.value}
              onChange={(event) =>
                setDisputeData((prev) => ({ ...prev, category: event.target.value }))
              }
              className="sr-only"
            />
            <div>
              <h4 className="font-medium text-fixly-text">{cat.label}</h4>
              <p className="mt-1 text-sm text-fixly-text-light">{cat.description}</p>
            </div>
          </label>
        ))}
      </div>

      {category && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Subcategory (Optional)
          </label>
          <input
            type="text"
            value={subcategory}
            onChange={(event) =>
              setDisputeData((prev) => ({ ...prev, subcategory: event.target.value }))
            }
            placeholder="More specific category..."
            className="input-field"
            maxLength={100}
          />
        </div>
      )}
    </div>
  );
}
