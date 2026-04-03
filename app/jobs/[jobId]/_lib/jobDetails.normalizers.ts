import type { JobApplication, JobDetails, JobUser, ReviewItem } from './jobDetails.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

function toIsoDate(value: unknown): string | null {
  const raw = value instanceof Date ? value.toISOString() : asString(value);
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function getRecordId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (isRecord(value)) {
    return asString(value._id) || asString(value.id);
  }

  return '';
}

function normalizeJobUser(value: unknown): JobUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getRecordId(value);
  if (!id) {
    return null;
  }

  const rating = isRecord(value.rating) ? value.rating : {};

  return {
    id,
    name: asString(value.name) || asString(value.username) || 'Unknown user',
    photoURL: asString(value.photoURL) || asString(value.picture) || null,
    rating: {
      average: asNumber(rating.average),
      count: asNumber(rating.count) ?? 0,
    },
    createdAt: toIsoDate(value.createdAt),
  };
}

function normalizeApplications(value: unknown): JobApplication[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const fixerId = isRecord(entry) ? getRecordId(entry.fixer) : '';
      if (!fixerId) {
        return null;
      }

      return {
        fixerId,
      } satisfies JobApplication;
    })
    .filter((entry): entry is JobApplication => entry !== null);
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function normalizeJob(value: unknown): JobDetails | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getRecordId(value);
  if (!id) {
    return null;
  }

  const budgetRecord = isRecord(value.budget) ? value.budget : {};
  const locationRecord = isRecord(value.location) ? value.location : {};
  const timelineRecord = isRecord(value.timeline) ? value.timeline : {};
  const viewsRecord = isRecord(value.views) ? value.views : {};
  const applications = normalizeApplications(value.applications);

  const createdBy = normalizeJobUser(value.createdBy);
  const client = normalizeJobUser(value.client) || normalizeJobUser(value.hirer) || createdBy;
  const fixer = normalizeJobUser(value.fixer) || normalizeJobUser(value.assignedTo);

  return {
    _id: id,
    title: asString(value.title) || 'Untitled job',
    description: asString(value.description) || 'No description available.',
    status: asString(value.status) || 'unknown',
    urgency: asString(value.urgency) || 'low',
    createdAt: toIsoDate(value.createdAt) || new Date().toISOString(),
    distance: asNumber(value.distance),
    viewsCount: asNumber(viewsRecord.count) ?? 0,
    commentsCount:
      asNumber(value.commentCount) ?? (Array.isArray(value.comments) ? value.comments.length : 0),
    locationCity: asString(locationRecord.city) || 'Location not specified',
    budget: {
      type: asString(budgetRecord.type) || 'negotiable',
      amount: asNumber(budgetRecord.amount),
      min: asNumber(budgetRecord.min),
      max: asNumber(budgetRecord.max),
    },
    timelineExpected: asString(timelineRecord.expected) || 'To be discussed',
    skillsRequired: normalizeSkills(value.skillsRequired),
    createdBy,
    hirerId: getRecordId(value.hirer) || getRecordId(value.createdBy),
    client,
    fixer,
    applicationCount: asNumber(value.applicationCount) ?? applications.length,
    applications,
  };
}

function normalizeReview(value: unknown): ReviewItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getRecordId(value);
  if (!id) {
    return null;
  }

  const reviewer = normalizeJobUser(value.reviewer);
  if (!reviewer) {
    return null;
  }

  const rating = isRecord(value.rating) ? value.rating : {};
  const helpfulVotes = isRecord(value.helpfulVotes) ? value.helpfulVotes : {};
  const response = isRecord(value.response)
    ? {
        comment: asString(value.response.comment),
      }
    : null;

  return {
    _id: id,
    reviewer,
    reviewerId: reviewer.id,
    reviewType: asString(value.reviewType),
    title: asString(value.title) || 'Review',
    comment: asString(value.comment),
    tags: normalizeSkills(value.tags),
    createdAt: toIsoDate(value.createdAt) || new Date().toISOString(),
    helpfulVotesCount: asNumber(helpfulVotes.count) ?? 0,
    wouldRecommend: value.wouldRecommend === true,
    response: response?.comment ? response : null,
    ratingOverall: asNumber(rating.overall) ?? 0,
  };
}

export function normalizeReviews(value: unknown): ReviewItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeReview(entry))
    .filter((entry): entry is ReviewItem => entry !== null);
}
