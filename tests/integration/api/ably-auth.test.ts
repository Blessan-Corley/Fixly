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

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/models/Conversation', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

// Phase 2: Updated Ably auth integration coverage for the typed channel capability contract.
jest.mock('@/lib/ably', () => {
  const requestToken = jest.fn();

  return {
    Channels: {
      user: (userId: string) => `private:user:${userId}`,
      marketplace: 'marketplace:listings',
      conversation: (conversationId: string) => `chat:${conversationId}`,
      conversationPresence: (conversationId: string) => `presence:chat:${conversationId}`,
      admin: 'admin:activity',
    },
    getServerAbly: jest.fn(() => ({
      auth: {
        requestToken,
      },
    })),
  };
});

import { getServerSession } from 'next-auth/next';

import { GET } from '@/app/api/ably/auth/route';
import { getServerAbly } from '@/lib/ably';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

type ConversationQuery = {
  select: jest.MockedFunction<(selection: string) => ConversationQuery>;
  sort: jest.MockedFunction<(sort: Record<string, number>) => ConversationQuery>;
  limit: jest.MockedFunction<(count: number) => ConversationQuery>;
  lean: jest.MockedFunction<() => Promise<Array<{ _id?: unknown }>>>;
};

function createConversationQuery(rows: Array<{ _id?: unknown }>): ConversationQuery {
  const query = {
    select: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
  } as ConversationQuery;

  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockResolvedValue(rows);

  return query;
}

class TestHeaders {
  private readonly values = new Map<string, string>();

  constructor(init?: Iterable<[string, string]> | Record<string, string>) {
    if (!init) {
      return;
    }

    if (typeof (init as Iterable<[string, string]>)[Symbol.iterator] === 'function') {
      for (const [key, value] of Array.from(init as Iterable<[string, string]>)) {
        this.set(key, value);
      }
      return;
    }

    Object.entries(init).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  get(name: string): string | undefined {
    return this.values.get(name.toLowerCase());
  }

  has(name: string): boolean {
    return this.values.has(name.toLowerCase());
  }

  set(name: string, value: string): void {
    this.values.set(name.toLowerCase(), value);
  }

  delete(name: string): void {
    this.values.delete(name.toLowerCase());
  }

  append(name: string, value: string): void {
    this.set(name, value);
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.values[Symbol.iterator]();
  }
}

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockConversationFind = Conversation.find as jest.Mock;
const mockUserFindById = User.findById as jest.Mock;
const mockRequestToken = (getServerAbly as jest.Mock)().auth.requestToken as jest.Mock;

function mockUserLookupResult(
  user: { _id?: unknown; banned?: boolean; isActive?: boolean; deletedAt?: Date | null } | null
) {
  mockUserFindById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(user),
    }),
  });
}

describe('/api/ably/auth', () => {
  beforeAll(() => {
    global.Headers = TestHeaders as unknown as typeof Headers;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({
      success: true,
      remainingAttempts: 119,
      resetTime: Date.now() + 60_000,
    });
    mockConnectDB.mockResolvedValue({} as never);
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
      },
    });
    mockUserLookupResult({
      _id: 'user-123',
      banned: false,
      isActive: true,
      deletedAt: null,
    });
    mockRequestToken.mockResolvedValue({
      token: 'ably-token',
      expires: 123456789,
    });
  });

  it('rejects unauthenticated token requests', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/ably/auth'));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Authentication required' });
  });

  it('enforces rate limiting on token creation', async () => {
    mockRateLimit.mockResolvedValue({
      success: false,
      remainingAttempts: 0,
      resetTime: Date.now() + 60_000,
    });

    const response = await GET(new Request('http://localhost/api/ably/auth'));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error).toContain('Too many token requests');
    expect(mockRequestToken).not.toHaveBeenCalled();
  });

  it('rejects disabled accounts before issuing an Ably token', async () => {
    mockUserLookupResult({
      _id: 'user-123',
      banned: true,
      isActive: true,
      deletedAt: null,
    });

    const response = await GET(new Request('http://localhost/api/ably/auth'));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain('not eligible');
    expect(mockRequestToken).not.toHaveBeenCalled();
  });

  it('scopes capabilities to the user notifications, presence, and authorized conversations', async () => {
    mockConversationFind.mockReturnValueOnce(
      createConversationQuery([{ _id: 'conv-1' }, { _id: 'conv-2' }])
    );

    const response = await GET(new Request('http://localhost/api/ably/auth'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      token: 'ably-token',
      expires: 123456789,
    });
    expect(mockRequestToken).toHaveBeenCalledTimes(1);

    const [request] = mockRequestToken.mock.calls[0] as [
      {
        clientId: string;
        capability: string;
        ttl: number;
      },
    ];
    const capability = JSON.parse(request.capability) as Record<string, string[]>;

    expect(request.clientId).toBe('user-123');
    expect(request.ttl).toBe(60 * 60 * 1000);
    expect(capability).toMatchObject({
      'private:user:user-123': ['subscribe'],
      'job:*': ['subscribe'],
      'marketplace:listings': ['subscribe'],
      'chat:conv-1': ['publish', 'subscribe', 'presence'],
      'presence:chat:conv-1': ['publish', 'subscribe', 'presence'],
      'chat:conv-2': ['publish', 'subscribe', 'presence'],
      'presence:chat:conv-2': ['publish', 'subscribe', 'presence'],
    });
    expect(capability['chat:*']).toBeUndefined();
    expect(capability['user:*:notifications']).toBeUndefined();
  });
});
