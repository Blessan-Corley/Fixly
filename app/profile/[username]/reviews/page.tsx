import type { Metadata } from 'next';

import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

import UserReviewsPageClient from './page.client';

type ProfileReviewsPageProps = {
  params: Promise<{
    username: string;
  }>;
};

type UserSeoRecord = {
  username?: string;
  name?: string;
  bio?: string;
  role?: string;
  rating?: {
    average?: number;
    count?: number;
  };
};

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

async function getUserSeoData(username: string): Promise<UserSeoRecord | null> {
  if (!username) return null;

  try {
    await connectDB();
    const user = await User.findOne({ username })
      .select('username name bio role rating.average rating.count')
      .lean();
    return (user ?? null) as UserSeoRecord | null;
  } catch (error: unknown) {
    console.error('Failed to load profile review SEO metadata:', error);
    return null;
  }
}

export async function generateMetadata(props: ProfileReviewsPageProps): Promise<Metadata> {
  const params = await props.params;
  const username = typeof params.username === 'string' ? params.username : '';
  const user = await getUserSeoData(username);
  const canonicalPath = `/profile/${encodeURIComponent(username)}/reviews`;

  if (!user) {
    return {
      title: `Reviews for @${username || 'user'} | Fixly`,
      description: 'Read ratings and reviews from Fixly users.',
      alternates: {
        canonical: canonicalPath,
      },
    };
  }

  const displayName =
    typeof user.name === 'string' && user.name.trim()
      ? user.name.trim()
      : typeof user.username === 'string' && user.username.trim()
        ? `@${user.username.trim()}`
        : 'Fixly User';
  const roleLabel = typeof user.role === 'string' ? user.role : 'service professional';
  const ratingAverage = typeof user.rating?.average === 'number' ? user.rating.average : null;
  const ratingCount = typeof user.rating?.count === 'number' ? user.rating.count : 0;
  const bio = typeof user.bio === 'string' ? user.bio.trim() : '';

  const ratingText =
    ratingAverage != null && ratingCount > 0
      ? `Rated ${ratingAverage.toFixed(1)}/5 from ${ratingCount} review${ratingCount === 1 ? '' : 's'}.`
      : 'Browse reviews and ratings.';
  const description = truncateText(
    bio || `${displayName} on Fixly (${roleLabel}). ${ratingText}`,
    160
  );
  const title = `${displayName} Reviews | Fixly`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: 'profile',
    },
    twitter: {
      title,
      description,
      card: 'summary',
    },
  };
}

export default function UserReviewsPage(): JSX.Element {
  return <UserReviewsPageClient />;
}
