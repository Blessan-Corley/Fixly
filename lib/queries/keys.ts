/**
 * React Query key factory.
 * All query keys in the app must be defined here.
 */
export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (jobId: string) => [...queryKeys.jobs.details(), jobId] as const,
    applications: (jobId: string) => [...queryKeys.jobs.detail(jobId), 'applications'] as const,
    reviews: (jobId: string) => [...queryKeys.jobs.detail(jobId), 'reviews'] as const,
    saved: ['jobs', 'saved'] as const,
    browse: (filters: Record<string, unknown>) => ['jobs', 'browse', filters] as const,
  },
  users: {
    all: ['users'] as const,
    me: ['users', 'me'] as const,
    profile: (userId: string) => ['users', 'profile', userId] as const,
    publicProfile: (userId: string) => ['users', 'public', userId] as const,
    publicProfileByUsername: (username: string) => ['users', 'public-username', username] as const,
    reviews: (userId: string) => ['users', 'reviews', userId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) => ['notifications', 'list', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: () => ['conversations', 'list'] as const,
    detail: (conversationId: string) => ['conversations', conversationId] as const,
    messages: (conversationId: string) => ['conversations', conversationId, 'messages'] as const,
  },
  disputes: {
    all: ['disputes'] as const,
    list: (filters?: Record<string, unknown>) => ['disputes', 'list', filters] as const,
    detail: (disputeId: string) => ['disputes', disputeId] as const,
  },
  admin: {
    metrics: ['admin', 'metrics'] as const,
    users: (filters?: Record<string, unknown>) => ['admin', 'users', filters] as const,
    jobs: (filters?: Record<string, unknown>) => ['admin', 'jobs', filters] as const,
    disputes: (filters?: Record<string, unknown>) => ['admin', 'disputes', filters] as const,
    verificationQueue: (status?: string) => ['admin', 'verification-queue', status] as const,
  },
  search: {
    results: (query: string, filters: Record<string, unknown>) =>
      ['search', query, filters] as const,
  },
  earnings: {
    list: (filters?: Record<string, unknown>) => ['earnings', filters] as const,
  },
} as const;
