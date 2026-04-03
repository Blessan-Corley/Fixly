import type { CreateJobInput } from '@/lib/services/jobs/createJob';
import { parseDate } from '@/lib/services/jobs/job.schema';
import type {
  BudgetType,
  JobType,
  LeanJob,
  NormalizedAttachment,
  Urgency,
} from '@/lib/services/jobs/job.types';
import { countActiveApplicationsOnJob } from '@/models/job/workflow';

type BuildCreateJobInputParams = {
  title: string;
  description: string;
  skillsRequired: string[];
  budgetType: BudgetType;
  budgetAmount: number | null;
  materialsIncluded: boolean;
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  deadline: Date | null;
  urgency: Urgency;
  type: JobType;
  userId: string;
  featured: boolean;
  attachments: NormalizedAttachment[];
  scheduledDate: Date | null;
};

export function buildCreateJobInput(params: BuildCreateJobInputParams): CreateJobInput {
  const jobData: CreateJobInput = {
    title: params.title,
    description: params.description,
    skillsRequired: params.skillsRequired,
    budget: {
      type: params.budgetType,
      amount: params.budgetAmount ?? 0,
      currency: 'INR',
      materialsIncluded: params.materialsIncluded,
    },
    location: {
      address: params.address,
      city: params.city,
      state: params.state,
      pincode: params.pincode || undefined,
      lat: params.lat ?? undefined,
      lng: params.lng ?? undefined,
    },
    deadline: params.urgency === 'scheduled' ? null : params.deadline,
    urgency: params.urgency,
    type: params.type,
    createdBy: params.userId,
    status: 'open',
    featured: params.featured,
    attachments: params.attachments,
  };

  if (params.scheduledDate) {
    jobData.scheduledDate = params.scheduledDate;
  }

  if (jobData.featured) {
    jobData.featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  return jobData;
}

export function resolveReferenceDate(job: LeanJob): Date | null {
  const deadline = parseDate(job.deadline);
  if (deadline) return deadline;
  return parseDate(job.scheduledDate);
}

export function formatTimeRemaining(diffMs: number): string {
  if (diffMs <= 0) return 'Expired';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  return 'Less than 1 hour';
}

export function mapListedJobs(jobs: LeanJob[]): Array<Record<string, unknown>> {
  return jobs.map((job) => {
    const referenceDate = resolveReferenceDate(job);
    const diffMs = referenceDate ? referenceDate.getTime() - Date.now() : Number.POSITIVE_INFINITY;
    const isExpired = job.status === 'expired' || (Number.isFinite(diffMs) && diffMs <= 0);
    const applicationCount = Array.isArray(job.applications)
      ? countActiveApplicationsOnJob({ applications: job.applications })
      : 0;

    return {
      ...job,
      applicationCount,
      timeRemaining: Number.isFinite(diffMs) ? formatTimeRemaining(diffMs) : 'No deadline',
      isUrgent: Number.isFinite(diffMs) && diffMs <= 24 * 60 * 60 * 1000 && job.status === 'open',
      isExpired,
      applications: undefined,
    };
  });
}
