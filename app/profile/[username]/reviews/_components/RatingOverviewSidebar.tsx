import { Star } from 'lucide-react';

import type { RatingStats } from '../_lib/reviews.types';
import { formatRatingValue } from '../_lib/reviews.utils';

type RatingOverviewSidebarProps = {
  ratingStats: RatingStats | null;
};

function RatingBars({ stats }: { stats: RatingStats }): React.JSX.Element {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = stats.distribution[rating] ?? 0;
        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

        return (
          <div key={rating} className="flex items-center space-x-3">
            <div className="flex w-12 items-center space-x-1">
              <span className="text-sm text-fixly-text">{rating}</span>
              <Star className="h-3 w-3 fill-current text-yellow-500" />
            </div>
            <div className="h-2 flex-1 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-yellow-500 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-sm text-fixly-text-light">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function DetailedRatingsSection({
  title,
  group,
}: {
  title: string;
  group: Record<string, number | string | undefined>;
}): React.JSX.Element {
  return (
    <div className="mb-4 space-y-2 last:mb-0">
      <p className="text-xs font-medium text-fixly-text-light">{title}</p>
      {Object.entries(group).map(([key, value]) => {
        if (key === 'totalReviews' || key === '_id') {
          return null;
        }

        return (
          <div key={key} className="flex justify-between text-sm">
            <span className="capitalize text-fixly-text-light">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </span>
            <span className="font-medium text-fixly-text">{formatRatingValue(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RatingOverviewSidebar({
  ratingStats,
}: RatingOverviewSidebarProps): React.JSX.Element {
  return (
    <div className="card sticky top-8">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Rating Overview</h3>

      {ratingStats && ratingStats.total > 0 ? (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-fixly-text">{ratingStats.average}</div>
            <div className="mb-2 flex items-center justify-center">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-5 w-5 ${
                    index < Math.floor(ratingStats.average)
                      ? 'fill-current text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-fixly-text-light">
              Based on {ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-medium text-fixly-text">Rating Distribution</h4>
            <RatingBars stats={ratingStats} />
          </div>

          {ratingStats.detailed && (
            <div>
              <h4 className="mb-3 text-sm font-medium text-fixly-text">Detailed Ratings</h4>
              {ratingStats.detailed.asFixer && (
                <DetailedRatingsSection
                  title="As Service Provider"
                  group={ratingStats.detailed.asFixer}
                />
              )}
              {ratingStats.detailed.asClient && (
                <DetailedRatingsSection title="As Client" group={ratingStats.detailed.asClient} />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center">
          <Star className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
          <p className="text-fixly-text-light">No reviews yet</p>
        </div>
      )}
    </div>
  );
}
