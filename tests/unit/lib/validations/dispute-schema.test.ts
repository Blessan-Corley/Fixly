import { describe, expect, it } from 'vitest';

import { CreateDisputeSchema, UpdateDisputeStatusSchema } from '@/lib/validations/dispute';

describe('CreateDisputeSchema', () => {
  const validInput = {
    category: 'payment',
    title: 'Fixer did not complete the job',
    description: 'The fixer left halfway through the project without finishing.',
    desiredOutcome: 'Full refund requested',
  };

  it('accepts valid minimum input', () => {
    const result = CreateDisputeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts full valid input with all optional fields', () => {
    const result = CreateDisputeSchema.safeParse({
      ...validInput,
      subcategory: 'incomplete-work',
      desiredOutcomeDetails: 'Please refund the ₹5000 advance payment made.',
      amount: 5000,
      jobId: 'job_abc123',
      againstUserId: 'user_xyz456',
      disputedAmount: 4500,
      refundRequested: 4500,
      additionalPaymentRequested: 0,
    });
    expect(result.success).toBe(true);
  });

  describe('category', () => {
    it('rejects empty string category', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, category: '' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('category');
    });

    it('rejects category exceeding 100 characters', () => {
      const result = CreateDisputeSchema.safeParse({
        ...validInput,
        category: 'c'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('accepts category at exactly 100 characters', () => {
      const result = CreateDisputeSchema.safeParse({
        ...validInput,
        category: 'c'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing category', () => {
      const { category: _omit, ...rest } = validInput;
      const result = CreateDisputeSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('title', () => {
    it('rejects empty title', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, title: '' });
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding 150 characters', () => {
      const result = CreateDisputeSchema.safeParse({
        ...validInput,
        title: 't'.repeat(151),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('title');
    });
  });

  describe('description', () => {
    it('rejects empty description', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, description: '' });
      expect(result.success).toBe(false);
    });

    it('rejects description exceeding 2000 characters', () => {
      const result = CreateDisputeSchema.safeParse({
        ...validInput,
        description: 'd'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('accepts description at exactly 2000 characters', () => {
      const result = CreateDisputeSchema.safeParse({
        ...validInput,
        description: 'd'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('desiredOutcome', () => {
    it('rejects empty desiredOutcome', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, desiredOutcome: '' });
      expect(result.success).toBe(false);
    });

    it('rejects desiredOutcome exceeding 200 characters', () => {
      const result = CreateDisputeSchema.safeParse({
        ...validInput,
        desiredOutcome: 'x'.repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('numeric optional fields', () => {
    it('rejects negative amount', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, amount: -1 });
      expect(result.success).toBe(false);
    });

    it('accepts amount of 0', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, amount: 0 });
      expect(result.success).toBe(true);
    });

    it('rejects negative disputedAmount', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, disputedAmount: -100 });
      expect(result.success).toBe(false);
    });

    it('rejects negative refundRequested', () => {
      const result = CreateDisputeSchema.safeParse({ ...validInput, refundRequested: -50 });
      expect(result.success).toBe(false);
    });

    it('rejects negative additionalPaymentRequested', () => {
      const result = CreateDisputeSchema.safeParse({
        ...validInput,
        additionalPaymentRequested: -1,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('UpdateDisputeStatusSchema', () => {
  it('accepts valid status', () => {
    const result = UpdateDisputeStatusSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(true);
  });

  it('accepts all valid status values', () => {
    const statuses = [
      'pending',
      'under_review',
      'awaiting_response',
      'in_mediation',
      'resolved',
      'escalated',
      'closed',
      'cancelled',
    ] as const;

    for (const status of statuses) {
      const result = UpdateDisputeStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    const result = UpdateDisputeStatusSchema.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('status');
  });

  it('rejects missing status', () => {
    const result = UpdateDisputeStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional moderatorNotes', () => {
    const result = UpdateDisputeStatusSchema.safeParse({
      status: 'resolved',
      moderatorNotes: 'Case resolved in favour of hirer.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects moderatorNotes exceeding 2000 characters', () => {
    const result = UpdateDisputeStatusSchema.safeParse({
      status: 'resolved',
      moderatorNotes: 'n'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional resolution', () => {
    const result = UpdateDisputeStatusSchema.safeParse({
      status: 'closed',
      resolution: 'Partial refund issued.',
    });
    expect(result.success).toBe(true);
  });
});
