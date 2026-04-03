import { ArrowLeft, Star, User } from 'lucide-react';
import Image from 'next/image';

import type { ProfileUser, RatingStats } from '../_lib/reviews.types';

type UserReviewsHeaderProps = {
  user: ProfileUser;
  ratingStats: RatingStats | null;
  onBack: () => void;
};

export function UserReviewsHeader({
  user,
  ratingStats,
  onBack,
}: UserReviewsHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center text-fixly-text-light hover:text-fixly-accent"
      >
        <ArrowLeft className="mr-2 h-5 w-5" />
        Back
      </button>

      <div className="flex items-start space-x-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-fixly-accent-light">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.name}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <User className="h-10 w-10 text-fixly-accent" />
          )}
        </div>

        <div className="flex-1">
          <h1 className="mb-2 text-3xl font-bold text-fixly-text">{user.name}&apos;s Reviews</h1>
          <p className="mb-4 text-fixly-text-light">
            @{user.username} • {user.role === 'fixer' ? 'Service Provider' : 'Client'}
          </p>

          {ratingStats && ratingStats.total > 0 && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Star className="mr-1 h-5 w-5 fill-current text-yellow-500" />
                <span className="text-xl font-semibold text-fixly-text">{ratingStats.average}</span>
                <span className="ml-1 text-fixly-text-light">
                  ({ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
