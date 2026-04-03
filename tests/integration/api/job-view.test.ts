// Phase 2: Updated job view integration expectations to the normalized API error envelope.
jest.mock('mongoose', () => {
  const startSession = jest.fn();

  function MockObjectId(this: { value: string }, value: string): void {
    this.value = value;
  }

  MockObjectId.prototype.toString = function toString(): string {
    return this.value;
  };

  Object.assign(MockObjectId, {
    isValid(value: string): boolean {
      return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
    },
  });

  return {
    __esModule: true,
    default: {
      startSession,
      Types: {
        ObjectId: MockObjectId,
      },
    },
    startSession,
    Types: {
      ObjectId: MockObjectId,
    },
  };
});

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/models/JobView', () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn(),
    distinct: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('@/app/api/jobs/[jobId]/realtime', () => ({
  publishJobCountsUpdate: jest.fn(),
}));

import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';

import { publishJobCountsUpdate } from '@/app/api/jobs/[jobId]/realtime';
import { GET, POST } from '@/app/api/jobs/[jobId]/view/route';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import JobView from '@/models/JobView';

type MockSession = {
  withTransaction: (callback: () => Promise<void>) => Promise<void>;
  endSession: () => Promise<void>;
};

type QueryChain<T> = {
  select: jest.MockedFunction<(selection: string) => QueryChain<T>>;
  session: jest.MockedFunction<(session: MockSession) => QueryChain<T>>;
  lean: jest.MockedFunction<() => Promise<T>>;
};

function createQueryChain<T>(value: T): QueryChain<T> {
  const chain = {
    select: jest.fn(),
    session: jest.fn(),
    lean: jest.fn(),
  } as QueryChain<T>;

  chain.select.mockReturnValue(chain);
  chain.session.mockReturnValue(chain);
  chain.lean.mockResolvedValue(value);

  return chain;
}

function createDbSession(): MockSession {
  return {
    withTransaction: jest.fn(async (callback: () => Promise<void>) => {
      await callback();
    }),
    endSession: jest.fn(async () => {}),
  };
}

describe('/api/jobs/[jobId]/view', () => {
  const jobId = '507f1f77bcf86cd799439031';

  beforeEach(() => {
    jest.resetAllMocks();
    (connectDB as jest.Mock).mockResolvedValue(undefined);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
      },
    });
    (mongoose.startSession as jest.Mock).mockResolvedValue(createDbSession());
  });

  it('requires authentication before tracking a view', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/view`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      success: false,
      error: 'Authentication required',
      message: 'Authentication required',
    });
    expect(connectDB).not.toHaveBeenCalled();
  });

  it('tracks the first daily view and publishes the updated counts', async () => {
    (Job.findById as jest.Mock).mockReturnValueOnce(
      createQueryChain({
        _id: jobId,
        createdBy: '507f1f77bcf86cd799439099',
        applications: [{ status: 'pending' }, { status: 'withdrawn' }],
        comments: [{ _id: 'comment-1' }, { _id: 'comment-2' }],
        views: { count: 3 },
      })
    );
    (JobView.updateOne as jest.Mock).mockResolvedValue({ upsertedCount: 1 });
    (Job.findByIdAndUpdate as jest.Mock).mockReturnValueOnce(
      createQueryChain({
        views: { count: 4 },
      })
    );

    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/view`, {
        method: 'POST',
        headers: [
          ['user-agent', 'jest'],
          ['x-forwarded-for', '10.0.0.1'],
        ],
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      viewCount: 4,
      viewTracked: true,
    });
    expect(JobView.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        job: jobId,
        user: '507f1f77bcf86cd799439011',
      }),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
        }),
      }),
      expect.objectContaining({
        session: expect.any(Object),
        upsert: true,
      })
    );
    expect(publishJobCountsUpdate).toHaveBeenCalledWith(jobId, {
      type: 'view_count',
      applicationCount: 1,
      commentCount: 2,
      viewCount: 4,
    });
  });

  it('does not increment or publish when the same user already viewed the job today', async () => {
    (Job.findById as jest.Mock).mockReturnValueOnce(
      createQueryChain({
        _id: jobId,
        createdBy: '507f1f77bcf86cd799439099',
        applications: [{ status: 'pending' }],
        comments: [],
        views: { count: 7 },
      })
    );
    (JobView.updateOne as jest.Mock).mockResolvedValue({ upsertedCount: 0 });

    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/view`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      viewCount: 7,
      viewTracked: false,
    });
    expect(Job.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(publishJobCountsUpdate).not.toHaveBeenCalled();
  });

  it('ignores self-views by the job creator', async () => {
    (Job.findById as jest.Mock).mockReturnValueOnce(
      createQueryChain({
        _id: jobId,
        createdBy: '507f1f77bcf86cd799439011',
        applications: [],
        comments: [],
        views: { count: 5 },
      })
    );

    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/view`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      viewCount: 5,
      viewTracked: false,
    });
    expect(JobView.updateOne).not.toHaveBeenCalled();
    expect(publishJobCountsUpdate).not.toHaveBeenCalled();
  });

  it('falls back to non-transactional tracking when Mongo transactions are unavailable', async () => {
    const unsupportedError = new Error('Transaction support is not available on this deployment');
    const endSession = jest.fn(async () => {});

    (mongoose.startSession as jest.Mock).mockResolvedValue({
      withTransaction: jest.fn(async () => {
        throw unsupportedError;
      }),
      endSession,
    });
    (Job.findById as jest.Mock)
      .mockReturnValueOnce(
        createQueryChain({
          _id: jobId,
          createdBy: '507f1f77bcf86cd799439099',
          applications: [],
          comments: [],
          views: { count: 2 },
        })
      )
      .mockReturnValueOnce(
        createQueryChain({
          _id: jobId,
          createdBy: '507f1f77bcf86cd799439099',
          applications: [],
          comments: [],
          views: { count: 2 },
        })
      );
    (JobView.updateOne as jest.Mock).mockResolvedValue({ upsertedCount: 1 });
    (Job.findByIdAndUpdate as jest.Mock).mockReturnValueOnce(
      createQueryChain({
        views: { count: 3 },
      })
    );

    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/view`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.viewTracked).toBe(true);
    expect(endSession).toHaveBeenCalled();
    expect(publishJobCountsUpdate).toHaveBeenCalledWith(jobId, {
      type: 'view_count',
      applicationCount: 0,
      commentCount: 0,
      viewCount: 3,
    });
  });

  it('returns merged legacy and realtime view statistics', async () => {
    (Job.findById as jest.Mock).mockReturnValueOnce(
      createQueryChain({
        views: {
          count: 9,
          uniqueViewers: [{ userId: 'user-1' }, { userId: 'user-2' }],
          dailyViews: [
            { date: '2026-02-20', count: 2 },
            { date: '2026-02-22', count: 1 },
          ],
        },
      })
    );
    (JobView.distinct as jest.Mock).mockResolvedValue(['user-2', 'user-3']);
    (JobView.aggregate as jest.Mock).mockResolvedValue([
      { _id: '2026-02-21', count: 4 },
      { _id: '2026-02-22', count: 3 },
    ]);

    const response = await GET(new Request(`http://localhost/api/jobs/${jobId}/view`), {
      params: Promise.resolve({ jobId }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      views: {
        total: 9,
        uniqueViewers: 3,
        dailyViews: [
          { date: '2026-02-20', count: 2 },
          { date: '2026-02-21', count: 4 },
          { date: '2026-02-22', count: 4 },
        ],
      },
    });
  });
});
