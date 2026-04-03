import mongoose from 'mongoose';

export type ObjectIdLike = mongoose.Types.ObjectId | string;

export type WorkflowApplication = {
  _id?: ObjectIdLike;
  fixer: ObjectIdLike;
  status: string;
};

type WorkflowApplications = WorkflowApplication[] & {
  id: (id: ObjectIdLike) => WorkflowApplication | null | undefined;
};

export type WorkflowJob = {
  createdBy: ObjectIdLike;
  assignedTo?: ObjectIdLike | null;
  status: string;
  deadline?: Date | string;
  applications: WorkflowApplications;
  progress: {
    startedAt?: Date;
    completedAt?: Date;
    markedDoneAt?: Date;
    [key: string]: unknown;
  };
  completion: {
    markedDoneBy?: ObjectIdLike;
    markedDoneAt?: Date;
    completionNotes?: string;
    afterImages?: string[];
    confirmedBy?: ObjectIdLike;
    confirmedAt?: Date;
    rating?: number;
    review?: string;
    [key: string]: unknown;
  };
  cancellation: {
    cancelled?: boolean;
    cancelledBy?: ObjectIdLike;
    reason?: string;
    cancelledAt?: Date;
    [key: string]: unknown;
  };
  dispute: {
    raised?: boolean;
    raisedBy?: ObjectIdLike;
    reason?: string;
    description?: string;
    evidence?: string[];
    createdAt?: Date;
    [key: string]: unknown;
  };
};

export type WorkflowResult<T = undefined> = { ok: true; value: T } | { ok: false; code: string };

function sameId(
  left: ObjectIdLike | null | undefined,
  right: ObjectIdLike | null | undefined
): boolean {
  if (!left || !right) return false;
  return left.toString() === right.toString();
}

function ensureMutableSections(job: WorkflowJob): void {
  job.progress = job.progress || {};
  job.completion = job.completion || {};
  job.cancellation = job.cancellation || {};
  job.dispute = job.dispute || {};
}

export function canApplyToJob(job: WorkflowJob, userId: ObjectIdLike): boolean {
  if (job.status !== 'open') return false;
  if (sameId(job.createdBy, userId)) return false;
  if (job.deadline && new Date(job.deadline) < new Date()) return false;

  const hasApplied = job.applications.some(
    (application: WorkflowApplication) =>
      sameId(application.fixer, userId) && application.status !== 'withdrawn'
  );

  return !hasApplied;
}

export function getApplicationByFixer(
  job: WorkflowJob,
  fixerId: ObjectIdLike
): WorkflowApplication | undefined {
  return job.applications.find((application: WorkflowApplication) =>
    sameId(application.fixer, fixerId)
  );
}

export function countActiveApplicationsOnJob(job: { applications?: unknown[] | null }): number {
  if (!Array.isArray(job.applications)) {
    return 0;
  }

  return job.applications.filter(
    (application) =>
      typeof application !== 'object' ||
      application === null ||
      (application as { status?: unknown }).status !== 'withdrawn'
  ).length;
}

export function withdrawApplicationOnJob(
  job: WorkflowJob,
  fixerId: ObjectIdLike
): WorkflowResult<WorkflowApplication> {
  const application = job.applications.find(
    (entry: WorkflowApplication) => sameId(entry.fixer, fixerId) && entry.status === 'pending'
  );

  if (!application) {
    return { ok: false, code: 'pending_application_not_found' };
  }

  application.status = 'withdrawn';
  return { ok: true, value: application };
}

export function acceptApplicationOnJob(
  job: WorkflowJob,
  applicationId: ObjectIdLike,
  startedAt: Date = new Date()
): WorkflowResult<WorkflowApplication> {
  ensureMutableSections(job);

  const application = job.applications.id(applicationId);
  if (!application) {
    return { ok: false, code: 'application_not_found' };
  }

  if (job.status !== 'open') {
    return { ok: false, code: 'job_not_open' };
  }

  application.status = 'accepted';
  job.assignedTo = application.fixer;
  job.status = 'in_progress';
  job.progress.startedAt = job.progress.startedAt || startedAt;

  job.applications.forEach((entry: WorkflowApplication) => {
    if (!sameId(entry._id, applicationId) && entry.status === 'pending') {
      entry.status = 'rejected';
    }
  });

  return { ok: true, value: application };
}

export function markDoneOnJob(
  job: WorkflowJob,
  fixerId: ObjectIdLike,
  notes = '',
  afterImages: string[] = [],
  completedAt: Date = new Date()
): WorkflowResult<undefined> {
  ensureMutableSections(job);

  if (!job.assignedTo) {
    return { ok: false, code: 'not_assigned' };
  }

  if (!sameId(job.assignedTo, fixerId)) {
    return { ok: false, code: 'not_assigned_fixer' };
  }

  if (job.status !== 'in_progress') {
    return { ok: false, code: 'job_not_in_progress' };
  }

  job.status = 'completed';
  job.progress.completedAt = completedAt;
  job.progress.markedDoneAt = completedAt;
  job.completion.markedDoneBy = fixerId;
  job.completion.markedDoneAt = completedAt;
  job.completion.completionNotes = notes;
  job.completion.afterImages = afterImages;

  return { ok: true, value: undefined };
}

export function confirmCompletionOnJob(
  job: WorkflowJob,
  hirerId: ObjectIdLike,
  rating: number,
  review = '',
  confirmedAt: Date = new Date()
): WorkflowResult<undefined> {
  ensureMutableSections(job);

  if (!sameId(job.createdBy, hirerId)) {
    return { ok: false, code: 'not_job_creator' };
  }

  if (job.status !== 'completed') {
    return { ok: false, code: 'job_not_completed' };
  }

  job.completion.confirmedBy = hirerId;
  job.completion.confirmedAt = confirmedAt;
  job.completion.rating = rating;
  job.completion.review = review;

  return { ok: true, value: undefined };
}

export function cancelJobOnJob(
  job: WorkflowJob,
  cancelledBy: ObjectIdLike,
  reason: string,
  enforceCreator = true,
  cancelledAt: Date = new Date()
): WorkflowResult<undefined> {
  ensureMutableSections(job);

  if (enforceCreator && !sameId(job.createdBy, cancelledBy)) {
    return { ok: false, code: 'not_job_creator' };
  }

  if (job.status !== 'open' && job.status !== 'in_progress') {
    return { ok: false, code: 'job_not_cancellable' };
  }

  job.cancellation.cancelled = true;
  job.cancellation.cancelledBy = cancelledBy;
  job.cancellation.reason = reason;
  job.cancellation.cancelledAt = cancelledAt;
  job.status = 'cancelled';

  return { ok: true, value: undefined };
}

export function raiseDisputeOnJob(
  job: WorkflowJob,
  userId: ObjectIdLike,
  reason: string,
  description: string,
  evidence: string[] = [],
  createdAt: Date = new Date()
): WorkflowResult<undefined> {
  ensureMutableSections(job);

  if (!job.assignedTo) {
    return { ok: false, code: 'not_assigned' };
  }

  if (!sameId(job.createdBy, userId) && !sameId(job.assignedTo, userId)) {
    return { ok: false, code: 'not_participant' };
  }

  job.dispute.raised = true;
  job.dispute.raisedBy = userId;
  job.dispute.reason = reason;
  job.dispute.description = description;
  job.dispute.evidence = evidence;
  job.dispute.createdAt = createdAt;
  job.status = 'disputed';

  return { ok: true, value: undefined };
}
