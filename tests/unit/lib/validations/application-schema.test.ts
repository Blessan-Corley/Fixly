import { describe, expect, it } from 'vitest';

import {
  CreateApplicationSchema,
  WithdrawApplicationSchema,
} from '@/lib/validations/application';

describe('CreateApplicationSchema', () => {
  it('accepts valid input with only coverLetter', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'I am a professional plumber with 10 years experience.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'I am the best fixer for this job.',
      proposedRate: 150,
      availability: 'Weekdays 9am-5pm',
      experience: 'I have worked on 200+ similar jobs.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty coverLetter (no min length constraint)', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects coverLetter exceeding 3000 characters', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'a'.repeat(3001),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('coverLetter');
  });

  it('accepts coverLetter at exactly 3000 characters', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'a'.repeat(3000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative proposedRate', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'Cover letter here.',
      proposedRate: -10,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('proposedRate');
  });

  it('accepts proposedRate of 0', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'Cover letter here.',
      proposedRate: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts omitted proposedRate', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'Cover letter here.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proposedRate).toBeUndefined();
    }
  });

  it('rejects availability exceeding 200 characters', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'Cover.',
      availability: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('availability');
  });

  it('rejects experience exceeding 2000 characters', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'Cover.',
      experience: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('experience');
  });

  it('rejects non-number proposedRate', () => {
    const result = CreateApplicationSchema.safeParse({
      coverLetter: 'Cover letter.',
      proposedRate: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing coverLetter', () => {
    const result = CreateApplicationSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('coverLetter');
  });
});

describe('WithdrawApplicationSchema', () => {
  it('accepts empty object (reason is optional)', () => {
    const result = WithdrawApplicationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts object with reason', () => {
    const result = WithdrawApplicationSchema.safeParse({
      reason: 'Found a better opportunity.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects reason exceeding 500 characters', () => {
    const result = WithdrawApplicationSchema.safeParse({
      reason: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('reason');
  });

  it('accepts reason at exactly 500 characters', () => {
    const result = WithdrawApplicationSchema.safeParse({
      reason: 'x'.repeat(500),
    });
    expect(result.success).toBe(true);
  });
});
