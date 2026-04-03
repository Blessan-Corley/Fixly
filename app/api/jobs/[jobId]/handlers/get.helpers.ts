import type { JsonObject } from '../job-route-utils';
import { toIdString } from '../job-route-utils';
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
