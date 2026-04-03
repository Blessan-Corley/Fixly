import { logger } from '@/lib/logger';
import type { JobStatus, LeanJob } from '@/lib/services/jobs/job.types';
import Job from '@/models/Job';
import User from '@/models/User';

type ListJobsForUserParams = {
  userId: string;
  statusFilter: JobStatus | null;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
};

export async function markExpiredJobsForUser(userId: string): Promise<void> {
  try {
    const now = new Date();
    await Job.updateMany(
      {
        createdBy: userId,
        status: 'open',
        $or: [
          { deadline: { $type: 'date', $lt: now } },
          { urgency: 'scheduled', scheduledDate: { $type: 'date', $lt: now } },
        ],
      },
      {
        $set: { status: 'expired' },
      }
    );
  } catch (updateError: unknown) {
    logger.error({ error: updateError }, 'Error updating expired jobs');
  }
}

export async function listJobsForUser(
  params: ListJobsForUserParams
): Promise<{ jobs: LeanJob[]; total: number }> {
  const query: Record<string, unknown> = { createdBy: params.userId };
  if (params.statusFilter) {
    query.status = params.statusFilter;
  }

  const [jobsResult, totalResult] = await Promise.all([
    Job.find(query)
      .select(
        [
          'title',
          'description',
          'status',
          'urgency',
          'deadline',
          'createdAt',
          'updatedAt',
          'budget',
          'location',
          'applications',
          'views',
          'assignedTo',
          'createdBy',
          'attachments',
          'comments',
          'featured',
        ].join(' ')
      )
      .sort(params.sort)
      .skip(params.skip)
      .limit(params.limit)
      .populate('assignedTo', 'name username profilePhoto picture rating')
      .lean(),
    Job.countDocuments(query),
  ]);

  return {
    jobs: jobsResult as LeanJob[],
    total: Number(totalResult || 0),
  };
}

export async function getInactiveJobs(olderThan: Date): Promise<Array<{ _id: string }>> {
  const jobs = await Job.find({
    status: 'open',
    updatedAt: { $lte: olderThan },
  })
    .select('_id')
    .lean<Array<{ _id: { toString(): string } }>>();

  return jobs.map((job) => ({ _id: job._id.toString() }));
}

export async function findMatchingFixers(
  jobId: string
): Promise<Array<{ _id: string; email?: string; name?: string }>> {
  const job = await Job.findById(jobId)
    .select('skillsRequired location')
    .lean<{ skillsRequired?: string[]; location?: { city?: string; state?: string } } | null>();

  if (!job) {
    return [];
  }

  const skillFilters = Array.isArray(job.skillsRequired) && job.skillsRequired.length > 0
    ? { skills: { $in: job.skillsRequired } }
    : {};

  const locationConditions: Array<Record<string, string>> = [];
  if (job.location?.city) {
    locationConditions.push({ 'location.city': job.location.city });
  }
  if (job.location?.state) {
    locationConditions.push({ 'location.state': job.location.state });
  }

  const fixers = await User.find({
    role: 'fixer',
    isActive: true,
    banned: { $ne: true },
    ...skillFilters,
    ...(locationConditions.length > 0 ? { $or: locationConditions } : {}),
  })
    .select('_id email name')
    .limit(50)
    .lean<Array<{ _id: { toString(): string }; email?: string; name?: string }>>();

  return fixers.map((fixer) => ({
    _id: fixer._id.toString(),
    email: fixer.email,
    name: fixer.name,
  }));
}
