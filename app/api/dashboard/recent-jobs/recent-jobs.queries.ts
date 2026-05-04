import type { Types } from 'mongoose';

import Job from '@/models/Job';

import { getAssignedUserId, toTimestamp, type JobApplication, type JobRecord } from './helpers';

type UserId = Types.ObjectId | string;

export async function fetchHirerJobs(userId: UserId, limit: number): Promise<JobRecord[]> {
  const hirerJobs = (await Job.find({ createdBy: userId })
    .populate('assignedTo', 'name username profilePhoto picture rating')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()) as JobRecord[];

  return hirerJobs.map((job) => {
    const { applications, ...rest } = job;
    return {
      ...rest,
      applicationCount: Array.isArray(applications) ? applications.length : 0,
    };
  });
}

export async function fetchFixerJobs(userId: UserId, limit: number): Promise<JobRecord[]> {
  const fixerJobs = (await Job.find({
    $or: [{ 'applications.fixer': userId }, { assignedTo: userId }],
  })
    .populate('createdBy', 'name username profilePhoto picture rating location')
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean()) as JobRecord[];

  const userIdStr = String(userId);
  const transformed = fixerJobs.map((job) => {
    const applications = Array.isArray(job.applications) ? job.applications : [];
    const userApplication = (applications as JobApplication[]).find(
      (application) => String(application.fixer) === userIdStr
    );
    const assignedUserId = getAssignedUserId(job.assignedTo);
    const isAssigned = assignedUserId === userIdStr;
    const { applications: _, ...rest } = job;

    return {
      ...rest,
      applicationStatus: userApplication?.status || (isAssigned ? 'assigned' : 'pending'),
      appliedAt: userApplication?.appliedAt,
      proposedAmount: userApplication?.proposedAmount,
      activityAt: userApplication?.appliedAt || job.updatedAt || job.createdAt,
    };
  });

  transformed.sort(
    (a, b) =>
      toTimestamp(b.activityAt as string | Date) - toTimestamp(a.activityAt as string | Date)
  );
  return transformed.slice(0, limit);
}

export async function fetchAdminJobs(limit: number): Promise<JobRecord[]> {
  const adminJobs = (await Job.find({})
    .populate('createdBy', 'name username profilePhoto picture')
    .populate('assignedTo', 'name username profilePhoto picture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()) as JobRecord[];

  return adminJobs.map((job) => {
    const { applications, ...rest } = job;
    return {
      ...rest,
      applicationCount: Array.isArray(applications) ? applications.length : 0,
    };
  });
}
