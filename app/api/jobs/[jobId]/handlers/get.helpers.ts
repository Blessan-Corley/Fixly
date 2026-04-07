import type { JsonObject } from '../job-route-utils';
import { sanitizeString, toIdString } from '../job-route-utils';
import type { JobApplicationLike } from '../route-actions';

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function addLegacyAliases(jobData: JsonObject): JsonObject {
  const createdBy = jobData.createdBy ?? null;
  const assignedTo = jobData.assignedTo ?? null;
  return { ...jobData, client: createdBy, hirer: createdBy, fixer: assignedTo };
}

export function sanitizeApplications(
  applications: JobApplicationLike[],
  viewerUserId: string,
  isJobCreator: boolean
): JsonObject[] | undefined {
  if (!Array.isArray(applications)) return undefined;

  const serialized = applications.map((application) => ({
    _id: toIdString(application?._id),
    fixer: toIdString(application?.fixer),
    proposedAmount: application?.proposedAmount,
    priceVariance: application?.priceVariance,
    priceVariancePercentage: application?.priceVariancePercentage,
    timeEstimate: application?.timeEstimate,
    materialsList: application?.materialsList,
    description: application?.description,
    requirements: application?.requirements,
    specialNotes: application?.specialNotes,
    negotiationNotes: application?.negotiationNotes,
    status: application?.status,
    appliedAt: application?.appliedAt,
  }));

  if (isJobCreator) return serialized;
  const mine = serialized.filter((application) => application.fixer === viewerUserId);
  return mine.length ? mine : undefined;
}

type JobAgg = {
  _id?: unknown;
  title?: string;
  description?: string;
  skillsRequired?: unknown;
  budget?: { type?: string; amount?: number };
  urgency?: string;
  status?: string;
  location?: { city?: string; state?: string };
  createdBy?: unknown;
  assignedTo?: unknown;
  completion?: { confirmedAt?: unknown };
  createdAt?: Date | string;
  [key: string]: unknown;
};

export function buildRestrictedJobView(
  job: JobAgg,
  activeApplicationCount: number,
  commentCount: number
): JsonObject {
  const createdBy = asRecord(job.createdBy);
  return {
    _id: job._id,
    title: job.title,
    description:
      typeof job.description === 'string' && job.description.length > 200
        ? `${job.description.slice(0, 200)}...`
        : job.description,
    skillsRequired: job.skillsRequired ?? [],
    budget:
      job.budget?.type === 'negotiable'
        ? { type: 'negotiable' }
        : {
            type: job.budget?.type,
            amount:
              typeof job.budget?.amount === 'number' && job.budget.amount > 0
                ? `INR ${Math.floor(job.budget.amount / 1000)}k+`
                : null,
          },
    urgency: job.urgency,
    status: job.status,
    location: { city: job.location?.city, state: job.location?.state },
    createdBy: { name: createdBy.name, rating: createdBy.rating },
    applicationCount: activeApplicationCount,
    commentCount,
    createdAt: job.createdAt,
    restrictedView: true,
  };
}

export function applyFixerVisibility(
  jobData: JsonObject,
  job: JobAgg,
  isAssignedFixer: boolean
): JsonObject {
  const createdBy = asRecord(job.createdBy);
  const createdByLocation = asRecord(createdBy.location);
  const jobCompleted = job.status === 'completed' && !!job.completion?.confirmedAt;
  const showContactInfo = isAssignedFixer && jobCompleted;

  const baseCreatedBy: Record<string, unknown> = {
    name: createdBy.name,
    username: createdBy.username,
    photoURL: createdBy.photoURL,
    picture: createdBy.picture,
    rating: createdBy.rating,
    isVerified: createdBy.isVerified,
    location: { city: createdByLocation.city, state: createdByLocation.state },
  };

  const result: JsonObject = {
    ...jobData,
    createdBy: showContactInfo
      ? { ...baseCreatedBy, phone: createdBy.phone, email: createdBy.email }
      : baseCreatedBy,
    location: showContactInfo
      ? job.location
      : { city: job.location?.city, state: job.location?.state },
    contactInfoRestricted: !showContactInfo,
  };

  return result;
}

export function applyHirerAssignedVisibility(jobData: JsonObject, job: JobAgg): JsonObject {
  if (!job.assignedTo) return jobData;

  const jobCompleted = job.status === 'completed' && !!job.completion?.confirmedAt;
  if (jobCompleted) return { ...jobData, fixerContactInfoRestricted: false };

  const assignedToData = asRecord(jobData.assignedTo);
  const assignedLocation = asRecord(assignedToData.location);

  return {
    ...jobData,
    assignedTo: {
      ...assignedToData,
      phone: undefined,
      email: undefined,
      location: { city: assignedLocation.city, state: assignedLocation.state },
    },
    fixerContactInfoRestricted: true,
  };
}

export function computeSkillMatch(
  userSkills: string[] | undefined,
  jobSkillsRequired: unknown
): number {
  if (!Array.isArray(userSkills) || userSkills.length === 0) return 0;
  const requiredSkills = Array.isArray(jobSkillsRequired) ? jobSkillsRequired : [];
  if (requiredSkills.length === 0) return 0;

  const normalizedUserSkills = userSkills.map((s: string) => s.toLowerCase());
  const matchingSkills = requiredSkills.filter((skill: unknown) =>
    normalizedUserSkills.includes(String(skill).toLowerCase())
  );
  return (matchingSkills.length / requiredSkills.length) * 100;
}

export function isLocalJob(userCity: string | undefined, jobCity: string | undefined): boolean {
  return sanitizeString(userCity).toLowerCase() === sanitizeString(jobCity).toLowerCase();
}
