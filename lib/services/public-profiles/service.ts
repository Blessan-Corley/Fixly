import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import User from '@/models/User';

import { isValidObjectId, toStringId } from '../../mongo/objectid-utils';

type PublicUserProfile = {
  _id: string;
  name: string;
  avatar: string | null;
  role: string;
  bio: string;
  skills: string[];
  location: { city: string };
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  memberSince: string | null;
  verificationStatus: string;
  portfolioItems: unknown[];
  responseRate: number | null;
};

function getUserAvatar(user: Record<string, unknown> | null | undefined): string | null {
  if (!user) return null;
  const profilePhoto = user.profilePhoto;
  if (profilePhoto && typeof profilePhoto === 'object') {
    const url = (profilePhoto as Record<string, unknown>).url;
    if (typeof url === 'string' && url.length > 0) return url;
  }
  if (typeof user.picture === 'string' && user.picture.length > 0) return user.picture;
  if (typeof user.photoURL === 'string' && user.photoURL.length > 0) return user.photoURL;
  return null;
}

function toSafeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export async function getPublicUserProfile(userId: string): Promise<PublicUserProfile> {
  await connectDB();

  if (!isValidObjectId(userId)) throw new Error('Invalid user');

  const cacheKey = `user:public-profile:${userId}`;
  const cached = await redisUtils.get<PublicUserProfile>(cacheKey);
  if (cached) return cached;

  const user = await User.findById(userId)
    .select(
      'name role bio skills location rating jobsCompleted createdAt isVerified verifiedAt verification profilePhoto picture portfolio responseTime'
    )
    .lean<Record<string, unknown> | null>();

  if (!user) throw new Error('User not found');

  const ratingObj =
    user.rating && typeof user.rating === 'object' ? (user.rating as Record<string, unknown>) : {};
  const locationObj =
    user.location && typeof user.location === 'object'
      ? (user.location as Record<string, unknown>)
      : {};
  const verificationObj =
    user.verification && typeof user.verification === 'object'
      ? (user.verification as Record<string, unknown>)
      : {};

  const profile: PublicUserProfile = {
    _id: toStringId(user._id),
    name: toSafeString(user.name, 'Unknown user'),
    avatar: getUserAvatar(user),
    role: toSafeString(user.role, 'member'),
    bio: toSafeString(user.bio),
    skills: Array.isArray(user.skills)
      ? user.skills.map((s) => toSafeString(s)).filter(Boolean)
      : [],
    location: { city: toSafeString(locationObj.city) },
    rating: Number.isFinite(Number(ratingObj.average)) ? Number(ratingObj.average) : 0,
    reviewCount: Number.isFinite(Number(ratingObj.count)) ? Number(ratingObj.count) : 0,
    jobsCompleted: typeof user.jobsCompleted === 'number' ? user.jobsCompleted : 0,
    memberSince: user.createdAt
      ? new Date(user.createdAt as string | number | Date).toISOString()
      : null,
    verificationStatus:
      user.isVerified === true ? 'verified' : toSafeString(verificationObj.status, 'none'),
    portfolioItems: Array.isArray(user.portfolio) ? user.portfolio : [],
    responseRate: null,
  };

  await redisUtils.set(cacheKey, profile, 120);
  return profile;
}
