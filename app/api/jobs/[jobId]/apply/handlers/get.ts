import { requireSession } from '@/lib/api/auth';
import {
  forbidden,
  notFound,
  respond,
  serverError,
  unauthorized,
} from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import { countActiveApplicationsOnJob } from '@/models/job/workflow';
import User from '@/models/User';

import { toIdString } from '../../job-route-utils';
import { getValidatedJobId, type JobRouteContext, CACHE_HEADERS, withCacheControl } from '../../route.shared';

import { asRecord, type SerializedApplication } from './shared';

type ApplicationFixer = {
  _id?: unknown;
  name?: string;
  username?: string;
  photoURL?: string;
  rating?: unknown;
  jobsCompleted?: number;
  location?: unknown;
  skills?: unknown;
};

type ApplicationRecord = {
  _id?: unknown;
  fixer?: ApplicationFixer | unknown;
  proposedAmount?: number;
  priceVariance?: number;
  priceVariancePercentage?: number;
  timeEstimate?: unknown;
  materialsList?: unknown[];
  description?: string;
  requirements?: string;
  specialNotes?: string;
  negotiationNotes?: string;
  status?: string;
  appliedAt?: Date | string;
};

type JobApplicationsProjection = {
  applications?: ApplicationRecord[];
  createdBy?: unknown;
};

function serializeApplication(application: unknown): SerializedApplication {
  const app = asRecord(application);
  const fixer = app.fixer;
  const fixerRecord = asRecord(fixer);

  return {
    _id: toIdString(app._id),
    fixer:
      fixer && typeof fixer === 'object' && fixer !== null
        ? {
            _id: toIdString(fixer),
            name: fixerRecord.name,
            username: fixerRecord.username,
            photoURL: fixerRecord.photoURL,
            rating: fixerRecord.rating,
            jobsCompleted: fixerRecord.jobsCompleted,
            location: fixerRecord.location,
            skills: fixerRecord.skills,
          }
        : toIdString(fixer),
    proposedAmount: app.proposedAmount,
    priceVariance: app.priceVariance || 0,
    priceVariancePercentage: app.priceVariancePercentage || 0,
    timeEstimate: app.timeEstimate,
    materialsList: Array.isArray(app.materialsList) ? app.materialsList : [],
    description: app.description || '',
    coverLetter: app.negotiationNotes || app.description || '',
    workPlan: app.description || '',
    negotiationNotes: app.negotiationNotes || '',
    requirements: app.requirements || '',
    specialNotes: app.specialNotes || '',
    status: app.status,
    appliedAt: app.appliedAt,
  };
}

export async function GET(_request: Request, segmentData: JobRouteContext) {
  const params = await segmentData.params;
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }
    const { jobId } = jobIdResult;

    await connectDB();

    const user = await User.findById(userId).select('_id role').lean();
    if (!user) {
      return notFound('User');
    }

    const job = await Job.findById(jobId)
      .select('applications createdBy')
      .populate('createdBy', 'name username photoURL')
      .lean<JobApplicationsProjection | null>();

    if (!job) {
      return notFound('Job');
    }

    const isJobCreator = toIdString(job.createdBy) === String(user._id);
    const isApplicant = Array.isArray(job.applications)
      ? job.applications.some((application) => toIdString(application?.fixer) === String(user._id))
      : false;
    const isAdmin = user.role === 'admin';

    if (!isJobCreator && !isApplicant && !isAdmin) {
      return forbidden('Access denied');
    }

    let applications: SerializedApplication[] = [];

    if (isJobCreator || isAdmin) {
      const jobWithApplications = await Job.findById(jobId)
        .select('applications')
        .populate(
          'applications.fixer',
          'name username photoURL rating jobsCompleted location skills'
        )
        .lean<JobApplicationsProjection | null>();

      applications = Array.isArray(jobWithApplications?.applications)
        ? jobWithApplications.applications.map((application) => serializeApplication(application))
        : [];
    } else {
      const ownApplication = Array.isArray(job.applications)
        ? job.applications.find(
            (application) => toIdString(application?.fixer) === String(user._id)
          )
        : null;

      applications = ownApplication ? [serializeApplication(ownApplication)] : [];
    }

    const response = respond({
      success: true,
      applications,
      totalApplications: countActiveApplicationsOnJob(job),
    });
    return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
  } catch (error) {
    logger.error('Get applications error:', error);
    return serverError('Failed to fetch applications');
  }
}
