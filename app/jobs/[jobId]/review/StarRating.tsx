'use client';

import { Star } from 'lucide-react';

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
};

export default function StarRating({ value, onChange, label }: StarRatingProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fixly-text">{label}</label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${
              star <= value ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-fixly-text-light">
          {value > 0 ? `${value}/5` : 'No rating'}
        </span>
      </div>
    </div>
  );
}
