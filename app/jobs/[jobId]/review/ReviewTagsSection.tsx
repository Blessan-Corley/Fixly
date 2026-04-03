'use client';

import {
  NEGATIVE_TAGS_FOR_CLIENT,
  NEGATIVE_TAGS_FOR_FIXER,
  POSITIVE_TAGS_FOR_CLIENT,
  POSITIVE_TAGS_FOR_FIXER,
} from './review.types';

type ReviewTagsSectionProps = {
  isClient: boolean;
  selectedTags: string[];
  onToggle: (tag: string) => void;
};

export default function ReviewTagsSection({
  isClient,
  selectedTags,
  onToggle,
}: ReviewTagsSectionProps) {
  const positiveTags = isClient ? POSITIVE_TAGS_FOR_FIXER : POSITIVE_TAGS_FOR_CLIENT;
  const negativeTags = isClient ? NEGATIVE_TAGS_FOR_FIXER : NEGATIVE_TAGS_FOR_CLIENT;

  return (
    <div className="card">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Tags</h3>
      <p className="mb-4 text-sm text-fixly-text-light">
        Select tags that describe your experience
      </p>

      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-medium text-green-600">Positive</h4>
          <div className="flex flex-wrap gap-2">
            {positiveTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(tag)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'border border-green-300 bg-green-100 text-green-800'
                    : 'border border-gray-300 bg-gray-100 text-gray-600 hover:bg-green-50'
                }`}
              >
                {tag.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-red-600">Areas for Improvement</h4>
          <div className="flex flex-wrap gap-2">
            {negativeTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(tag)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'border border-red-300 bg-red-100 text-red-800'
                    : 'border border-gray-300 bg-gray-100 text-gray-600 hover:bg-red-50'
                }`}
              >
                {tag.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
