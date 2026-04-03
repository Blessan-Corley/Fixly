type QueryFilters = Record<string, unknown>;
type QueryPrimitive = string | number | boolean | null | undefined;

export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    list: (filters: QueryFilters = {}) => ['jobs', 'list', filters] as const,
    detail: (jobId: string) => ['jobs', 'detail', jobId] as const,
    comments: (jobId: string) => ['jobs', 'comments', jobId] as const,
    applications: (jobId: string) => ['jobs', 'applications', jobId] as const,
    drafts: () => ['jobs', 'drafts'] as const,
    browse: (params: QueryFilters = {}) => ['jobs', 'browse', params] as const,
    stats: () => ['jobs', 'stats'] as const,
  },
  users: {
    profile: (userId: string) => ['users', 'profile', userId] as const,
    earnings: (period: string) => ['users', 'earnings', period] as const,
    notifications: (userId?: string) => ['users', 'notifications', userId] as const,
    applications: () => ['users', 'applications'] as const,
    detail: (userId: string) => ['users', 'detail', userId] as const,
    settings: (userId: string) => ['users', 'settings', userId] as const,
    fixerSettings: () => ['users', 'fixer-settings'] as const,
    reviews: (username: string) => ['users', 'reviews', username] as const,
  },
  search: {
    results: (query: string, filters: QueryFilters = {}) =>
      ['search', 'results', query, filters] as const,
    suggestions: (query: string) => ['search', 'suggestions', query] as const,
    location: (coordinates: { lat?: number; lng?: number } | null | undefined) =>
      ['search', 'location', coordinates] as const,
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
    recentJobs: () => ['dashboard', 'recentJobs'] as const,
  },
  messages: {
    conversations: () => ['messages', 'conversations'] as const,
    thread: (conversationId: string) => ['messages', 'thread', conversationId] as const,
    jobThread: (jobId: string) => ['messages', 'job-thread', jobId] as const,
  },
  reviews: {
    list: (userId: string) => ['reviews', 'list', userId] as const,
    helpful: (reviewId: string) => ['reviews', 'helpful', reviewId] as const,
  },
  disputes: {
    list: (filters: QueryFilters = {}) => ['disputes', 'list', filters] as const,
    detail: (disputeId: string) => ['disputes', 'detail', disputeId] as const,
  },
  admin: {
    dashboard: (range: string) => ['admin', 'dashboard', range] as const,
    stats: () => ['admin', 'stats'] as const,
    users: (filters: QueryFilters = {}) => ['admin', 'users', filters] as const,
    jobs: (filters: QueryFilters = {}) => ['admin', 'jobs', filters] as const,
    analytics: (timeRange: string) => ['admin', 'analytics', timeRange] as const,
    envHealth: () => ['admin', 'envHealth'] as const,
  },
  subscription: {
    fixer: () => ['subscription', 'fixer'] as const,
    hirer: () => ['subscription', 'hirer'] as const,
    eligibility: (role?: string) => ['subscription', 'eligibility', role] as const,
    verifyPayment: (sessionId: string) => ['subscription', 'verify-payment', sessionId] as const,
  },
  filters: {
    byValue: (name: string, value: QueryPrimitive) => ['filters', name, value] as const,
  },
  realtime: {
    notifications: (userId?: string) => ['realtime', 'notifications', userId] as const,
    messages: (conversationId: string) => ['realtime', 'messages', conversationId] as const,
    activity: () => ['realtime', 'activity'] as const,
  },
};
