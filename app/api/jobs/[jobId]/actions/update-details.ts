import { after, NextResponse } from 'next/server';

import { Channels as TypedChannels, Events as TypedEvents } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { badRequest, ok } from '@/lib/api';
import Job from '@/models/Job';

import { invalidateJobReadCaches, sanitizeString, toIdString } from '../job-route-utils';

import type { JobDocumentLike } from './types';

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

const ALLOWED_UPDATE_FIELDS = [
  'title',
  'description',
  'budget',
  'deadline',
  'urgency',
  'skillsRequired',
  'location',
  'type',
  'experienceLevel',
  'scheduledDate',
] as const;

export async function updateJobDetails(
  job: JobDocumentLike,
  data: Record<string, unknown>
): Promise<NextResponse> {
  if (job.status !== 'open') {
    return badRequest('Only open jobs can be edited');
  }

  const updateData: Record<string, unknown> = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (data.title && sanitizeString(data.title).length < 10) {
    return badRequest('Title must be at least 10 characters');
  }

  if (data.description && sanitizeString(data.description).length < 30) {
    return badRequest('Description must be at least 30 characters');
  }

  const deadlineDate = toDate(data.deadline);
  if (data.deadline !== undefined && (!deadlineDate || deadlineDate <= new Date())) {
    return badRequest('Deadline must be in the future');
  }

  const scheduledDate = toDate(data.scheduledDate);
  if (data.scheduledDate !== undefined && (!scheduledDate || scheduledDate <= new Date())) {
    return badRequest('Scheduled date must be in the future');
  }

  await Job.findByIdAndUpdate(job._id, updateData, { runValidators: true, new: true });
  await invalidateJobReadCaches(job._id);

  const jobId = toIdString(job._id);
  if (jobId) {
    const updatedFields = Object.keys(updateData);
    after(async () => {
      await Promise.allSettled([
        publishToChannel(TypedChannels.job(jobId), TypedEvents.job.jobUpdated, {
          jobId,
          updatedAt: new Date().toISOString(),
          fields: updatedFields,
        }),
        publishToChannel(TypedChannels.marketplace, TypedEvents.marketplace.jobUpdated, {
          jobId,
          updatedAt: new Date().toISOString(),
          fields: updatedFields,
        }),
      ]);
    });
  }

  return ok({ success: true, message: 'Job updated successfully' });
}
