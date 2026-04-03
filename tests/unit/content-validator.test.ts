import { vi } from 'vitest';
vi.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: vi.fn(),
    get: vi.fn(),
  },
}));

import { redisUtils } from '@/lib/redis';
import { ContentValidator, ViolationType } from '@/lib/validations/content-validator';

describe('ContentValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ContentValidator.violationCache.clear();
  });

  it('blocks public contact sharing in comments', async () => {
    const result = await ContentValidator.validateContent(
      'Call me at 9876543210 for the job',
      'comment',
      'user-1'
    );

    expect(result.isValid).toBe(false);
    expect(
      result.violations.some((violation) => violation.type === ViolationType.PHONE_NUMBER)
    ).toBe(true);
  });

  it('allows contact sharing in private messages but still flags abuse', async () => {
    const contactResult = await ContentValidator.validateContent(
      'My number is 9876543210',
      'private_message',
      'user-1'
    );
    const abuseResult = await ContentValidator.validateContent(
      'You are an idiot',
      'private_message',
      'user-1'
    );

    expect(contactResult.isValid).toBe(true);
    expect(contactResult.violations).toHaveLength(0);
    expect(abuseResult.isValid).toBe(false);
    expect(abuseResult.violations.some((violation) => violation.type === ViolationType.ABUSE)).toBe(
      true
    );
  });

  it('detects location leakage in public marketplace content', async () => {
    const result = await ContentValidator.validateContent(
      'Come to 221 Baker Street. pin 560001. coordinates 12.9716, 77.5946',
      'job_application',
      'user-1'
    );

    expect(result.isValid).toBe(false);
    expect(
      result.violations.some((violation) => violation.type === ViolationType.LOCATION_SHARING)
    ).toBe(true);
  });

  it('writes violation logs and a summary entry for monitored users', async () => {
    await ContentValidator.validateContent(
      'Reach me on WhatsApp at 9876543210',
      'comment',
      'user-99'
    );

    expect(redisUtils.setex).toHaveBeenCalledTimes(2);
    const summaryCall = (redisUtils.setex as jest.Mock).mock.calls.find(([key]) =>
      String(key).startsWith('content_violation_summary:user-99')
    );

    expect(summaryCall).toBeDefined();
    expect(summaryCall?.[2]).toContain('"count":1');
  });
});
