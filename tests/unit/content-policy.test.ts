jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn(),
  },
}));

import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import { ContentValidator } from '@/lib/validations/content-validator';

describe('content policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
  });

  it('allows comment mentions when the mention range is explicitly permitted', async () => {
    const content = '@alice thanks for the update';
    const result = await moderateUserGeneratedContent(content, {
      context: 'comment',
      fieldLabel: 'Comment',
      allowRanges: [{ startIndex: 0, endIndex: 6 }],
    });

    expect(result.allowed).toBe(true);
    expect(result.message).toBeNull();
  });

  it('still blocks social handles when they are not an allowed mention', async () => {
    const result = await moderateUserGeneratedContent('@dropmeoninsta message me', {
      context: 'comment',
      fieldLabel: 'Comment',
    });

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Comment');
  });

  it('returns a clear field-specific error message for blocked public content', async () => {
    const result = await moderateUserGeneratedContent('email me at test@example.com', {
      context: 'job_posting',
      fieldLabel: 'Job description',
    });

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Job description');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
