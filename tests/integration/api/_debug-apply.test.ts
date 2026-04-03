jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn((...args: unknown[]) => console.log('LOGGER ERROR:', ...args)),
    debug: jest.fn(),
  },
}));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/utils/rateLimiting', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/redis', () => ({ redisUtils: { setex: jest.fn(), get: jest.fn().mockResolvedValue(null) } }));
jest.mock('@/lib/ably/publisher', () => ({ publishToChannel: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/ably/events', () => ({ Channels: { job: (id: string) => `job:${id}`, user: (id: string) => `user:${id}` }, Events: { job: { applicationSubmitted: 'app.submitted' }, user: { notificationSent: 'notif.sent' } } }));
jest.mock('@/lib/inngest/client', () => ({ inngest: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/lib/validations/content-policy', () => ({ moderateUserGeneratedContent: jest.fn().mockResolvedValue({ allowed: true }) }));
jest.mock('@/models/Job', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('@/models/User', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('@/models/job/workflow', () => ({ countActiveApplicationsOnJob: jest.fn().mockReturnValue(1) }));
jest.mock('@/app/api/jobs/[jobId]/job-route-utils', () => ({ invalidateJobReadCaches: jest.fn().mockResolvedValue(undefined), sanitizeString: (v: unknown) => (typeof v === 'string' ? v.trim() : ''), toIdString: (v: unknown) => v ? String(v) : '' }));
jest.mock('@/app/api/jobs/[jobId]/realtime', () => ({ publishJobCountsUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/app/api/jobs/[jobId]/route.shared', () => ({ getValidatedJobId: jest.fn(), CACHE_HEADERS: { PRIVATE_NO_STORE: 'no-store' }, withCacheControl: (res: Response) => res }));

import { getServerSession } from 'next-auth/next';
import { POST } from '@/app/api/jobs/[jobId]/apply/route';
import { getValidatedJobId } from '@/app/api/jobs/[jobId]/route.shared';
import User from '@/models/User';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

describe('debug apply', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const hirerId = '507f1f77bcf86cd799439011';
  const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true, remainingAttempts: 10, resetTime: Date.now() + 3600000 });
    (getValidatedJobId as jest.Mock).mockReturnValue({ ok: true, jobId });
  });

  it('debug hirer apply', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hirerId, name: 'Hirer', role: 'hirer', csrfToken: TEST_CSRF_TOKEN } });
    (User.findById as jest.Mock).mockResolvedValue({ _id: hirerId, role: 'hirer', banned: false });
    (Job.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue({ _id: jobId, status: 'open', createdBy: hirerId, budget: { type: 'negotiable' }, deadline: null, applications: [], canApply: jest.fn(() => true), save: jest.fn() }) });

    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify({ proposedAmount: 500, description: 'test' }),
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();
    console.log('STATUS:', response.status);
  });
});
