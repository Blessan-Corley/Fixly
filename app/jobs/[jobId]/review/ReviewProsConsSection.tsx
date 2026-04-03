'use client';

import { Minus, Plus, ThumbsDown, ThumbsUp } from 'lucide-react';

import type { ProsConsType, ReviewFormData } from './review.types';

type ReviewProsConsSectionProps = {
  reviewData: ReviewFormData;
  onAdd: (type: ProsConsType) => void;
  onRemove: (type: ProsConsType, index: number) => void;
  onUpdate: (type: ProsConsType, index: number, value: string) => void;
};

export default function ReviewProsConsSection({
  reviewData,
  onAdd,
  onRemove,
  onUpdate,
}: ReviewProsConsSectionProps) {
  return (
    <div className="card">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Pros &amp; Cons</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <label className="text-sm font-medium text-fixly-text">What went well?</label>
            <button
              type="button"
              onClick={() => onAdd('pros')}
              className="text-green-600 hover:text-green-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {reviewData.pros.map((pro, index) => (
              <div key={`pro-${index}`} className="flex items-center space-x-2">
                <ThumbsUp className="h-4 w-4 flex-shrink-0 text-green-500" />
                <input
                  type="text"
                  value={pro}
                  onChange={(e) => onUpdate('pros', index, e.target.value)}
                  placeholder="Something positive..."
                  className="input-field flex-1"
                  maxLength={200}
                />
                {reviewData.pros.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemove('pros', index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <label className="text-sm font-medium text-fixly-text">
              What could be improved?
            </label>
            <button
              type="button"
              onClick={() => onAdd('cons')}
              className="text-red-600 hover:text-red-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {reviewData.cons.map((con, index) => (
              <div key={`con-${index}`} className="flex items-center space-x-2">
                <ThumbsDown className="h-4 w-4 flex-shrink-0 text-red-500" />
                <input
                  type="text"
                  value={con}
                  onChange={(e) => onUpdate('cons', index, e.target.value)}
                  placeholder="Something that could be better..."
                  className="input-field flex-1"
                  maxLength={200}
                />
                {reviewData.cons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemove('cons', index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
