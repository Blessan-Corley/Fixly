import { AppError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { requirePermission } from '@/lib/authorization';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';

export type CreateJobInput = Record<string, unknown>;

export type JobPostRecord = {
  _id: { toString(): string };
  title?: string;
  description?: string;
  skillsRequired?: unknown[];
  location?: unknown;
  budget?: unknown;
  urgency?: string;
  status?: string;
  featured?: boolean;
  createdAt?: Date;
  deadline?: Date | null;
  scheduledDate?: Date | null;
  createdBy?: unknown;
};

type MongooseValidationLike = {
  name?: string;
  errors?: Record<string, { message?: string }>;
};

export async function createJob(
  data: CreateJobInput,
  userId: string
): Promise<JobPostRecord> {
  await connectDB();

  const user = await User.findById(userId).select('_id role banned isActive deletedAt');
  if (!user) {
    throw new NotFoundError('User');
  }

  try {
    requirePermission({ role: user.role }, 'create', 'job');
  } catch {
    throw new ForbiddenError('Only hirers can post jobs');
  }

  if (user.banned || user.isActive === false || user.deletedAt) {
    throw new ForbiddenError('Account suspended');
  }

  const job = new Job({
    ...data,
    createdBy: user._id,
  });

  try {
    await job.save();
    return job as unknown as JobPostRecord;
  } catch (error: unknown) {
    const mongooseError = error as MongooseValidationLike;

    if (mongooseError.name === 'ValidationError' && mongooseError.errors) {
      const firstError = Object.values(mongooseError.errors)[0]?.message || 'Invalid job data';
      throw new AppError('VALIDATION_ERROR', firstError, 400);
    }

    throw new AppError('INTERNAL_ERROR', 'Failed to create job record', 500);
  }
}
