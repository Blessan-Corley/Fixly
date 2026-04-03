import { CreateDisputeSchema, UpdateDisputeStatusSchema } from '@/lib/validations/dispute';
import { CreateJobSchema, JobSearchParamsSchema, UpdateJobSchema } from '@/lib/validations/job';
import { CreateReviewSchema } from '@/lib/validations/review';

// ─── CreateJobSchema ───────────────────────────────────────────────────────────

const validJob = {
  title: 'Fix leaking kitchen tap',
  description: 'The kitchen tap has been leaking for two weeks and needs to be fixed immediately.',
  type: 'one-time',
  urgency: 'asap',
  budget: { type: 'fixed', amount: 500 },
  location: { address: '12 Main Street', city: 'Delhi', state: 'Delhi' },
};

describe('CreateJobSchema', () => {
  it('accepts a fully valid job', () => {
    expect(CreateJobSchema.safeParse(validJob).success).toBe(true);
  });

  it('rejects title shorter than 10 characters', () => {
    const result = CreateJobSchema.safeParse({ ...validJob, title: 'Short' });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 80 characters', () => {
    const result = CreateJobSchema.safeParse({ ...validJob, title: 'A'.repeat(81) });
    expect(result.success).toBe(false);
  });

  it('rejects description shorter than 30 characters', () => {
    const result = CreateJobSchema.safeParse({ ...validJob, description: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown job type', () => {
    const result = CreateJobSchema.safeParse({ ...validJob, type: 'gig' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown urgency', () => {
    const result = CreateJobSchema.safeParse({ ...validJob, urgency: 'urgent' });
    expect(result.success).toBe(false);
  });

  it('rejects negative budget amount', () => {
    const result = CreateJobSchema.safeParse({
      ...validJob,
      budget: { type: 'fixed', amount: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts negotiable budget with zero amount', () => {
    const result = CreateJobSchema.safeParse({
      ...validJob,
      budget: { type: 'negotiable', amount: 0 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects location with missing required fields', () => {
    const result = CreateJobSchema.safeParse({
      ...validJob,
      location: { address: '12 Main St', city: 'Delhi' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid pincode in location', () => {
    const result = CreateJobSchema.safeParse({
      ...validJob,
      location: { ...validJob.location, pincode: '110001' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid pincode format', () => {
    const result = CreateJobSchema.safeParse({
      ...validJob,
      location: { ...validJob.location, pincode: '1234' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional scheduledDate', () => {
    const result = CreateJobSchema.safeParse({
      ...validJob,
      scheduledDate: '2030-01-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects skillsRequired array exceeding 30 items', () => {
    const result = CreateJobSchema.safeParse({
      ...validJob,
      skillsRequired: Array.from({ length: 31 }, (_, i) => `skill-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateJobSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(UpdateJobSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update with only title', () => {
    const result = UpdateJobSchema.safeParse({ title: 'Fix the kitchen faucet properly' });
    expect(result.success).toBe(true);
  });

  it('still validates title length when provided', () => {
    const result = UpdateJobSchema.safeParse({ title: 'No' });
    expect(result.success).toBe(false);
  });
});

describe('JobSearchParamsSchema', () => {
  it('accepts empty params with defaults', () => {
    const result = JobSearchParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(12);
    }
  });

  it('accepts valid search params', () => {
    const result = JobSearchParamsSchema.safeParse({
      q: 'plumber',
      location: 'Delhi',
      sortBy: 'newest',
      page: '2',
      limit: '20',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects limit exceeding 100', () => {
    const result = JobSearchParamsSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it('rejects unknown sortBy value', () => {
    const result = JobSearchParamsSchema.safeParse({ sortBy: 'trending' });
    expect(result.success).toBe(false);
  });

  it('rejects negative budgetMin', () => {
    const result = JobSearchParamsSchema.safeParse({ budgetMin: -1 });
    expect(result.success).toBe(false);
  });

  it('coerces string numbers', () => {
    const result = JobSearchParamsSchema.safeParse({ budgetMin: '100', budgetMax: '5000' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgetMin).toBe(100);
      expect(result.data.budgetMax).toBe(5000);
    }
  });
});

// ─── CreateReviewSchema ────────────────────────────────────────────────────────

const validReview = {
  rating: 5,
  title: 'Excellent work',
  comment: 'The fixer arrived on time and did an exceptional job fixing the issue.',
};

describe('CreateReviewSchema', () => {
  it('accepts a valid review', () => {
    expect(CreateReviewSchema.safeParse(validReview).success).toBe(true);
  });

  it('rejects rating below 1', () => {
    const result = CreateReviewSchema.safeParse({ ...validReview, rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = CreateReviewSchema.safeParse({ ...validReview, rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = CreateReviewSchema.safeParse({ ...validReview, rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 150 characters', () => {
    const result = CreateReviewSchema.safeParse({ ...validReview, title: 'A'.repeat(151) });
    expect(result.success).toBe(false);
  });

  it('rejects comment exceeding 2000 characters', () => {
    const result = CreateReviewSchema.safeParse({ ...validReview, comment: 'A'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('accepts optional pros and cons arrays', () => {
    const result = CreateReviewSchema.safeParse({
      ...validReview,
      pros: ['Punctual', 'Professional'],
      cons: ['Slightly expensive'],
      wouldRecommend: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects tags array exceeding 20 items', () => {
    const result = CreateReviewSchema.safeParse({
      ...validReview,
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });
});

// ─── CreateDisputeSchema ───────────────────────────────────────────────────────

const validDispute = {
  category: 'payment',
  title: 'Overcharged for service',
  description: 'The fixer charged more than the agreed amount without prior notice.',
  desiredOutcome: 'partial_refund',
};

describe('CreateDisputeSchema', () => {
  it('accepts a valid dispute', () => {
    expect(CreateDisputeSchema.safeParse(validDispute).success).toBe(true);
  });

  it('rejects missing category', () => {
    const { category, ...rest } = validDispute;
    const result = CreateDisputeSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const { title, ...rest } = validDispute;
    const result = CreateDisputeSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 2000 characters', () => {
    const result = CreateDisputeSchema.safeParse({
      ...validDispute,
      description: 'A'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = CreateDisputeSchema.safeParse({ ...validDispute, amount: -100 });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = CreateDisputeSchema.safeParse({
      ...validDispute,
      subcategory: 'overcharge',
      amount: 500,
      jobId: 'abc123',
      disputedAmount: 200,
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateDisputeStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses = [
      'pending', 'under_review', 'awaiting_response', 'in_mediation',
      'resolved', 'escalated', 'closed', 'cancelled',
    ];
    validStatuses.forEach((status) => {
      const result = UpdateDisputeStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    });
  });

  it('rejects unknown status', () => {
    const result = UpdateDisputeStatusSchema.safeParse({ status: 'archived' });
    expect(result.success).toBe(false);
  });

  it('accepts optional moderatorNotes', () => {
    const result = UpdateDisputeStatusSchema.safeParse({
      status: 'resolved',
      moderatorNotes: 'Issue resolved after mediation.',
      resolution: 'Partial refund issued.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects moderatorNotes exceeding 2000 characters', () => {
    const result = UpdateDisputeStatusSchema.safeParse({
      status: 'resolved',
      moderatorNotes: 'A'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
