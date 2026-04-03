import { beforeEach, describe, expect, it } from 'vitest';

import { validateContent } from '@/lib/validations/content';
import { ViolationType } from '@/lib/validations/content/content.types';
import { ContentValidator } from '@/lib/validations/content/engine';

describe('validateContent()', () => {
  beforeEach(() => {
    ContentValidator.violationCache.clear();
  });

  it('passes valid professional content', async () => {
    const result = await validateContent(
      'Experienced plumber available for kitchen sink repairs tomorrow morning.',
      'job_application'
    );

    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails validation for profanity', async () => {
    const result = await validateContent('This is a shit job', 'comment');

    expect(result.isValid).toBe(false);
    expect(result.violations.some((violation) => violation.type === ViolationType.ABUSE)).toBe(
      true
    );
  });

  it('returns structured violation information for public contact sharing', async () => {
    const result = await validateContent(
      'Call me on WhatsApp, my number is 9876543210',
      'job_application'
    );

    expect(result.isValid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toMatchObject({
      type: expect.any(String),
      severity: expect.any(Number),
      message: expect.any(String),
      match: expect.any(String),
      position: expect.any(Number),
    });
  });

  it('flags very long comment content as spam', async () => {
    const longComment = 'a'.repeat(1001);
    const result = await validateContent(longComment, 'comment');

    expect(result.violations.some((violation) => violation.type === ViolationType.SPAM)).toBe(
      true
    );
  });

  it('returns a structured result for empty content', async () => {
    const result = await validateContent('', 'comment');

    expect(result).toEqual({
      isValid: true,
      violations: [],
      score: 0,
      cleanedContent: '',
      suggestions: [],
    });
  });
});
