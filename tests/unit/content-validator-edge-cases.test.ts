import { vi } from 'vitest';
vi.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: vi.fn(),
    get: vi.fn(),
  },
}));

import { redisUtils } from '@/lib/redis';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import { ContentValidator, ViolationType } from '@/lib/validations/content-validator';

describe('ContentValidator edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ContentValidator.violationCache.clear();
  });

  it('detects disguised email formats in public content', async () => {
    const result = await ContentValidator.validateContent(
      'Reach me at john dot doe at gmail dot com',
      'job_posting',
      'user-1'
    );

    expect(result.isValid).toBe(false);
    expect(
      result.violations.some((violation) => violation.type === ViolationType.EMAIL_ADDRESS)
    ).toBe(true);
  });

  it('allows sensitive information in notification text but still blocks abuse', async () => {
    const allowed = await ContentValidator.validateContent(
      'Meeting point is 12.9716, 77.5946 and my number is 9876543210',
      'notification',
      'user-2'
    );
    const blocked = await ContentValidator.validateContent(
      'You are a stupid idiot',
      'notification',
      'user-2'
    );

    expect(allowed.isValid).toBe(true);
    expect(allowed.violations).toHaveLength(0);
    expect(blocked.isValid).toBe(false);
    expect(blocked.violations.some((violation) => violation.type === ViolationType.ABUSE)).toBe(
      true
    );
  });

  it('increments the stored violation summary when prior data exists', async () => {
    (redisUtils.get as jest.Mock).mockResolvedValue(
      JSON.stringify({
        count: 2,
        lastViolationAt: 1700000000000,
        recentTypes: [ViolationType.PHONE_NUMBER],
      })
    );

    await ContentValidator.validateContent('Call me at 9876543210', 'comment', 'user-3');

    const summaryCall = (redisUtils.setex as jest.Mock).mock.calls.find(
      ([key]) => String(key) === 'content_violation_summary:user-3'
    );

    expect(summaryCall).toBeDefined();
    expect(String(summaryCall?.[2])).toContain('"count":3');
  });

  it('masks only the allowed mention range when moderating comment text', async () => {
    const result = await moderateUserGeneratedContent('@alice email me at test@example.com', {
      context: 'comment',
      fieldLabel: 'Comment',
      allowRanges: [{ startIndex: 0, endIndex: 6 }],
    });

    expect(result.allowed).toBe(false);
    expect(
      result.violations.some((violation) => violation.type === ViolationType.EMAIL_ADDRESS)
    ).toBe(true);
    expect(result.violations.some((violation) => violation.match === '@alice')).toBe(false);
  });
});
