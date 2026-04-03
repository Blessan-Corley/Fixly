import type { MetadataRoute } from 'next';

import connectDB from '@/lib/mongodb';
import { getSiteUrl } from '@/lib/siteUrl';
import Job from '@/models/Job';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

type JobSitemapRecord = {
  _id: string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
};

type UserSitemapRecord = {
  username?: string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
};

function toDate(value: Date | string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const dateValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dateValue.getTime()) ? fallback : dateValue;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes = [
    '/',
    '/about',
    '/how-it-works',
    '/search',
    '/pricing',
    '/services',
    '/help',
    '/contact',
    '/safety',
    '/resources',
    '/terms',
    '/privacy',
    '/cookies',
  ];

  const staticPages: MetadataRoute.Sitemap = staticRoutes.map((route, index) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: index === 0 ? 1 : 0.7,
  }));

  try {
    await connectDB();

    const [jobs, profiles] = await Promise.all([
      Job.find({ status: { $in: ['open', 'in_progress'] } })
        .select('_id updatedAt createdAt')
        .lean<JobSitemapRecord[]>(),
      User.find({
        username: { $exists: true, $ne: '' },
        'privacy.showProfile': { $ne: false },
      })
        .select('username updatedAt createdAt')
        .lean<UserSitemapRecord[]>(),
    ]);

    const dynamicJobs: MetadataRoute.Sitemap = jobs.map((job) => ({
      url: `${baseUrl}/jobs/${job._id}`,
      lastModified: toDate(job.updatedAt, toDate(job.createdAt, now)),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const dynamicProfiles: MetadataRoute.Sitemap = profiles
      .filter((profile) => typeof profile.username === 'string' && profile.username.length > 0)
      .map((profile) => ({
        url: `${baseUrl}/profile/${profile.username}`,
        lastModified: toDate(profile.updatedAt, toDate(profile.createdAt, now)),
        changeFrequency: 'weekly',
        priority: 0.6,
      }));

    return [...staticPages, ...dynamicJobs, ...dynamicProfiles];
  } catch {
    return staticPages;
  }
}
