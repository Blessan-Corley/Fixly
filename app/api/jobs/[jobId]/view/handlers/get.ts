import mongoose from 'mongoose';

import { getOptionalSession, notFound, respond, serverError } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import JobView from '@/models/JobView';

import { getValidatedJobId, type JobRouteContext } from '../../route.shared';

import { getUtcDateKey, getViewCount, mergeDailyViews } from './view.helpers';
import type { DailyViewAggregate, LegacyViewerEntry, TrackableJobProjection } from './view.types';

export async function GET(_request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    await getOptionalSession();
    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    await connectDB();

    const jobObjectId = new mongoose.Types.ObjectId(jobId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    const dailyViewStart = getUtcDateKey(thirtyDaysAgo);

    const [job, distinctViewerIds, dailyViewRows] = await Promise.all([
      Job.findById(jobId)
        .select('views.count views.uniqueViewers views.dailyViews')
        .lean<TrackableJobProjection | null>(),
      JobView.distinct('user', { job: jobObjectId }),
      JobView.aggregate<DailyViewAggregate>([
        { $match: { job: jobObjectId, viewedOn: { $gte: dailyViewStart } } },
        { $group: { _id: '$viewedOn', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    if (!job) return notFound('Job');

    const uniqueViewers = new Set<string>();

    if (Array.isArray(job.views?.uniqueViewers)) {
      for (const entry of job.views.uniqueViewers) {
        const viewerId =
          typeof entry === 'object' && entry !== null && 'userId' in entry
            ? String((entry as LegacyViewerEntry).userId || '')
            : '';
        if (viewerId) uniqueViewers.add(viewerId);
      }
    }

    for (const viewerId of distinctViewerIds) {
      const normalizedViewerId = String(viewerId || '');
      if (normalizedViewerId) uniqueViewers.add(normalizedViewerId);
    }

    return respond({
      success: true,
      views: {
        total: getViewCount(job),
        uniqueViewers: uniqueViewers.size,
        dailyViews: mergeDailyViews(job.views?.dailyViews, dailyViewRows),
      },
    });
  } catch (error: unknown) {
    logger.error('Get view stats error:', error);
    return serverError('Failed to get view statistics');
  }
}
