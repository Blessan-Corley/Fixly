'use client';

import Link from 'next/link';

import ProBadge, { isUserPro } from '@/components/ui/ProBadge';
import SmartAvatar from '@/components/ui/SmartAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

import { formatMemberSince, formatRole } from './_lib/publicProfile.helpers';
import type { PublicProfileRecord } from './_lib/publicProfile.types';

type PublicProfileHeaderProps = {
  profile: PublicProfileRecord;
  isOwnProfile: boolean;
};

export default function PublicProfileHeader({
  profile,
  isOwnProfile,
}: PublicProfileHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-5">
        <SmartAvatar
          user={{
            id: profile._id,
            name: profile.name,
            username: profile.username,
            profilePhoto: profile.profilePhoto,
          }}
          size="3xl"
          alt={`${profile.name ?? profile.username} profile photo`}
        />

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-fixly-text">
              {profile.name ?? profile.username}
            </h1>
            <VerifiedBadge user={profile} size="sm" showText={true} />
            <ProBadge isPro={isUserPro(profile)} size="sm" />
          </div>
          <p className="mt-2 text-base text-fixly-text-muted">@{profile.username}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-fixly-text-light">
            <span>{formatRole(profile.role)}</span>
            {profile.location?.city ? <span>• {profile.location.city}</span> : null}
            <span>• Member since {formatMemberSince(profile.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {!isOwnProfile && (
          <Link
            href={`/dashboard/messages?user=${profile._id}`}
            className="rounded-xl bg-fixly-accent px-4 py-2 font-medium text-white transition hover:bg-fixly-accent/90"
          >
            Message
          </Link>
        )}
        <Link
          href={`/profile/${profile.username}/reviews`}
          className="rounded-xl border border-fixly-border px-4 py-2 font-medium text-fixly-text transition hover:bg-fixly-bg"
        >
          View all reviews
        </Link>
        {isOwnProfile && (
          <Link
            href="/dashboard/profile"
            className="rounded-xl border border-fixly-border px-4 py-2 font-medium text-fixly-text transition hover:bg-fixly-bg"
          >
            Edit Profile
          </Link>
        )}
      </div>
    </div>
  );
}
