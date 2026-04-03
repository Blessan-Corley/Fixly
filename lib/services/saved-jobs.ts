// Phase 2: Replaced saved-jobs stub access with real database-backed services.
import { Types } from 'mongoose';

import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import User from '@/models/User';

const SAVED_JOBS_TTL = 60; // 60 seconds

export type SavedJobsPagination = {
  page: number;
  limit: number;
};

export type SavedJobsListResult = {
  items: Array<Record<string, unknown>>;
  total: number;
};

export type SavedJobMutationResult = {
  saved: boolean;
  jobId: string;
};

function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

function toObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function toStringId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    const candidate = value.toString;
    if (typeof candidate === 'function') {
      return candidate.call(value);
    }
  }

  return '';
}

export async function listSavedJobs(
  userId: string,
  pagination: SavedJobsPagination
): Promise<SavedJobsListResult> {
  if (!isValidObjectId(userId)) {
    return { items: [], total: 0 };
  }

  const cacheKey = `saved-jobs:v1:${userId}:${pagination.page}:${pagination.limit}`;
  const cached = await redisUtils.get<SavedJobsListResult>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await connectDB();

  const user = await User.findById(userId)
    .select('savedJobs')
    .lean<{ savedJobs?: Array<Types.ObjectId | string> } | null>();

  const savedJobIds = Array.isArray(user?.savedJobs)
    ? user.savedJobs.map((entry) => toStringId(entry)).filter((entry) => entry.length > 0)
    : [];

  if (savedJobIds.length === 0) {
    return { items: [], total: 0 };
  }

  const skip = (pagination.page - 1) * pagination.limit;
  const pagedSavedJobIds = [...savedJobIds].reverse().slice(skip, skip + pagination.limit);

  const jobs = await Job.find({
    _id: { $in: pagedSavedJobIds.map((jobId) => toObjectId(jobId)) },
  })
    .select(
      [
        'title',
        'description',
        'status',
        'urgency',
        'deadline',
        'createdAt',
        'budget',
        'location',
        'skillsRequired',
        'views',
        'applications',
        'comments',
        'createdBy',
        'featured',
        'assignedTo',
      ].join(' ')
    )
    .populate('createdBy', 'name username profilePhoto picture rating')
    .lean<Array<Record<string, unknown>>>();

  const orderMap = new Map<string, number>();
  pagedSavedJobIds.forEach((jobId, index) => {
    orderMap.set(jobId, index);
  });

  jobs.sort((left, right) => {
    const leftOrder = orderMap.get(toStringId(left._id)) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.get(toStringId(right._id)) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });

  const result: SavedJobsListResult = {
    items: jobs,
    total: savedJobIds.length,
  };
  await redisUtils.set(cacheKey, result, SAVED_JOBS_TTL);
  return result;
}

export async function saveJobForUser(
  jobId: string,
  userId: string
): Promise<SavedJobMutationResult> {
  await connectDB();

  if (!isValidObjectId(jobId) || !isValidObjectId(userId)) {
    throw new Error('Invalid save request');
  }

  const [job, user] = await Promise.all([
    Job.findById(jobId).select('_id').lean<{ _id: Types.ObjectId } | null>(),
    User.findById(userId).select('_id').lean<{ _id: Types.ObjectId } | null>(),
  ]);

  if (!job) {
    throw new Error('Job not found');
  }

  if (!user) {
    throw new Error('User not found');
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: {
      savedJobs: toObjectId(jobId),
    },
  });

  await redisUtils.invalidatePattern(`saved-jobs:v1:${userId}:*`);

  return {
    saved: true,
    jobId,
  };
}

export async function unsaveJobForUser(jobId: string, userId: string): Promise<void> {
  await connectDB();

  if (!isValidObjectId(jobId) || !isValidObjectId(userId)) {
    throw new Error('Invalid unsave request');
  }

  const user = await User.findById(userId).select('_id').lean<{ _id: Types.ObjectId } | null>();
  if (!user) {
    throw new Error('User not found');
  }

  await User.findByIdAndUpdate(userId, {
    $pull: {
      savedJobs: toObjectId(jobId),
    },
  });

  await redisUtils.invalidatePattern(`saved-jobs:v1:${userId}:*`);
}
