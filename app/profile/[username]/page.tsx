import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

import PublicProfilePageClient from './page.client';

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type PublicProfileRecord = {
  _id: unknown;
  name?: string;
  username?: string;
  bio?: string;
  skills?: string[];
  experience?: string;
  profilePhoto?: {
    url?: string | null;
  } | null;
  rating?: {
    average?: number;
    count?: number;
  };
  jobsCompleted?: number;
  role?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  plan?: {
    type?: string;
    status?: string;
  };
  createdAt?: Date | string;
};

async function getPublicProfile(username: string): Promise<PublicProfileRecord | null> {
  await connectDB();

  const user = await User.findOne({ username: username.toLowerCase() })
    .select(
      'name username bio skills experience profilePhoto rating jobsCompleted role isVerified emailVerified phoneVerified plan createdAt'
    )
    .lean<PublicProfileRecord | null>();

  return user;
}

function formatRole(role: string | undefined): string {
  if (!role) return 'Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function buildProfileDescription(user: PublicProfileRecord): string {
  if (user.bio && user.bio.trim().length > 0) {
    return user.bio.trim();
  }

  const skills = Array.isArray(user.skills) ? user.skills.filter(Boolean).slice(0, 3) : [];
  const role = formatRole(user.role).toLowerCase();

  if (skills.length > 0) {
    return `${user.name || user.username} is a ${role} on Fixly with skills in ${skills.join(', ')}.`;
  }

  return `${user.name || user.username} is a ${role} on Fixly.`;
}

export async function generateMetadata(props: ProfilePageProps): Promise<Metadata> {
  const params = await props.params;
  const user = await getPublicProfile(params.username);

  if (!user) {
    return {
      title: 'Profile not found — Fixly',
      description: 'This Fixly profile could not be found.',
    };
  }

  const title = `${user.name || user.username} (@${user.username}) — Fixly`;
  const description = buildProfileDescription(user);
  const canonicalPath = `/profile/${encodeURIComponent(params.username)}`;

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
  };
}

export default async function PublicProfilePage(props: ProfilePageProps): Promise<JSX.Element> {
  const params = await props.params;
  const user = await getPublicProfile(params.username);

  if (!user) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-fixly-bg px-4 py-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="h-48 animate-pulse rounded-3xl bg-white" />
            <div className="h-40 animate-pulse rounded-3xl bg-white" />
            <div className="h-64 animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      }
    >
      <PublicProfilePageClient username={params.username} />
    </Suspense>
  );
}
