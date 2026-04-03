'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

import { usePublicProfileByUsername, useUserReviews } from '@/lib/queries/users';

import { normalizeProfile, normalizeReviews } from './_lib/publicProfile.helpers';
import PublicProfileBody from './PublicProfileBody';
import PublicProfileHeader from './PublicProfileHeader';
import PublicProfileReviews from './PublicProfileReviews';

type PublicProfilePageClientProps = {
  username: string;
};

export default function PublicProfilePageClient({
  username,
}: PublicProfilePageClientProps): React.JSX.Element {
  const { data: session } = useSession();
  const { data, isLoading, isError } = usePublicProfileByUsername(username);
  const profile = useMemo(() => normalizeProfile(data), [data]);
  const userId = profile?._id ?? '';
  const { data: reviewsResponse } = useUserReviews(userId, { limit: 5 });
  const reviews = useMemo(() => normalizeReviews(reviewsResponse), [reviewsResponse]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-fixly-bg py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="animate-pulse rounded-3xl border border-fixly-border bg-fixly-card p-8 shadow-sm">
            <div className="h-10 w-1/3 rounded bg-gray-200" />
            <div className="mt-6 h-32 rounded bg-gray-100" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`profile-skeleton-${index}`} className="h-24 rounded-2xl bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fixly-bg p-8">
        <div className="max-w-md rounded-3xl border border-fixly-border bg-fixly-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-fixly-text">Profile not found</h1>
          <p className="mt-3 text-fixly-text-light">
            This Fixly profile could not be found or is no longer available.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const ratingsCount = typeof profile.rating?.count === 'number' ? profile.rating.count : 0;
  const averageRating =
    typeof profile.rating?.average === 'number' ? profile.rating.average.toFixed(1) : '0.0';
  const completedJobs =
    typeof profile.stats?.completedJobs === 'number' ? profile.stats.completedJobs : 0;
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];
  const isOwnProfile = session?.user?.id === profile._id;

  return (
    <div className="min-h-screen bg-fixly-bg py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-3xl border border-fixly-border bg-fixly-card p-8 shadow-sm">
          <PublicProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
          <PublicProfileBody
            profile={profile}
            averageRating={averageRating}
            ratingsCount={ratingsCount}
            completedJobs={completedJobs}
            skills={skills}
          />
          <PublicProfileReviews reviews={reviews} username={profile.username} />
        </div>
      </div>
    </div>
  );
}
