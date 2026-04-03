import { describe, expect, it } from 'vitest';

import { CreateReviewSchema, ReviewHelpfulSchema } from '@/lib/validations/review';

describe('CreateReviewSchema', () => {
  const validInput = {
    rating: 5,
    title: 'Excellent work!',
    comment: 'The fixer was professional and completed everything on time.',
  };

  it('accepts valid minimum input', () => {
    const result = CreateReviewSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts full valid input with all optional fields', () => {
    const result = CreateReviewSchema.safeParse({
      ...validInput,
      pros: ['Fast', 'Affordable'],
      cons: ['Slightly late'],
      wouldRecommend: true,
      wouldHireAgain: false,
      tags: ['plumbing', 'quick-service'],
    });
    expect(result.success).toBe(true);
  });

  describe('rating', () => {
    it('accepts rating of 1', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, rating: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts rating of 5', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, rating: 5 });
      expect(result.success).toBe(true);
    });

    it('rejects rating of 0', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, rating: 0 });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('rating');
    });

    it('rejects rating of 6', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, rating: 6 });
      expect(result.success).toBe(false);
    });

    it('rejects negative rating', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, rating: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects fractional rating (not integer)', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, rating: 3.5 });
      expect(result.success).toBe(false);
    });

    it('rejects non-number rating', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, rating: 'five' });
      expect(result.success).toBe(false);
    });

    it('rejects missing rating', () => {
      const { rating: _omit, ...rest } = validInput;
      const result = CreateReviewSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('title', () => {
    it('rejects empty title', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, title: '' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('title');
    });

    it('rejects title exceeding 150 characters', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, title: 't'.repeat(151) });
      expect(result.success).toBe(false);
    });

    it('accepts title at exactly 150 characters', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, title: 't'.repeat(150) });
      expect(result.success).toBe(true);
    });

    it('rejects missing title', () => {
      const { title: _omit, ...rest } = validInput;
      const result = CreateReviewSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('comment', () => {
    it('rejects empty comment', () => {
      const result = CreateReviewSchema.safeParse({ ...validInput, comment: '' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('comment');
    });

    it('rejects comment exceeding 2000 characters', () => {
      const result = CreateReviewSchema.safeParse({
        ...validInput,
        comment: 'c'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('accepts comment at exactly 2000 characters', () => {
      const result = CreateReviewSchema.safeParse({
        ...validInput,
        comment: 'c'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing comment', () => {
      const { comment: _omit, ...rest } = validInput;
      const result = CreateReviewSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('pros (optional)', () => {
    it('accepts omitted pros', () => {
      const result = CreateReviewSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects pro string exceeding 200 characters', () => {
      const result = CreateReviewSchema.safeParse({
        ...validInput,
        pros: ['p'.repeat(201)],
      });
      expect(result.success).toBe(false);
    });

    it('accepts pro string at exactly 200 characters', () => {
      const result = CreateReviewSchema.safeParse({
        ...validInput,
        pros: ['p'.repeat(200)],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('cons (optional)', () => {
    it('accepts omitted cons', () => {
      const result = CreateReviewSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects con string exceeding 200 characters', () => {
      const result = CreateReviewSchema.safeParse({
        ...validInput,
        cons: ['c'.repeat(201)],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tags (optional)', () => {
    it('accepts up to 20 tags', () => {
      const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      const result = CreateReviewSchema.safeParse({ ...validInput, tags });
      expect(result.success).toBe(true);
    });

    it('rejects more than 20 tags', () => {
      const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      const result = CreateReviewSchema.safeParse({ ...validInput, tags });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('tags');
    });

    it('rejects tag exceeding 50 characters', () => {
      const result = CreateReviewSchema.safeParse({
        ...validInput,
        tags: ['t'.repeat(51)],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('boolean optional fields', () => {
    it('accepts wouldRecommend as true or false', () => {
      expect(CreateReviewSchema.safeParse({ ...validInput, wouldRecommend: true }).success).toBe(true);
      expect(CreateReviewSchema.safeParse({ ...validInput, wouldRecommend: false }).success).toBe(true);
    });

    it('accepts wouldHireAgain as true or false', () => {
      expect(CreateReviewSchema.safeParse({ ...validInput, wouldHireAgain: true }).success).toBe(true);
      expect(CreateReviewSchema.safeParse({ ...validInput, wouldHireAgain: false }).success).toBe(true);
    });
  });
});

describe('ReviewHelpfulSchema', () => {
  it('accepts valid reviewId', () => {
    const result = ReviewHelpfulSchema.safeParse({ reviewId: 'review_abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty reviewId', () => {
    const result = ReviewHelpfulSchema.safeParse({ reviewId: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('reviewId');
  });

  it('rejects missing reviewId', () => {
    const result = ReviewHelpfulSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
