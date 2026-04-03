import {
  canApplyToJob,
  canPostJob,
  formatTimeRemaining,
  getNextJobPostTime,
  getPlanStatus,
  getRemainingApplications,
  isSubscriptionActive,
  isSubscriptionExpiringSoon,
} from '@/utils/creditUtils';

const FREE_CREDIT_LIMIT = 3;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

describe('canApplyToJob', () => {
  it('returns false for null/undefined user', () => {
    expect(canApplyToJob(null)).toBe(false);
    expect(canApplyToJob(undefined)).toBe(false);
  });

  it('returns false for hirer role', () => {
    expect(canApplyToJob({ role: 'hirer' })).toBe(false);
  });

  it('returns false for banned fixer', () => {
    expect(canApplyToJob({ role: 'fixer', banned: true })).toBe(false);
  });

  it('returns true for pro fixer with active plan', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(canApplyToJob({ role: 'fixer', plan: { type: 'pro', status: 'active', endDate: future } })).toBe(true);
  });

  it('falls back to free tier for expired pro plan (0 credits used → can still apply)', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    // Expired pro plan degrades to free tier; 0 credits used means they can still apply
    expect(canApplyToJob({ role: 'fixer', plan: { type: 'pro', status: 'active', endDate: past } })).toBe(true);
  });

  it('returns false for expired pro fixer who exhausted free credits', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(canApplyToJob({ role: 'fixer', plan: { type: 'pro', status: 'active', endDate: past, creditsUsed: FREE_CREDIT_LIMIT } })).toBe(false);
  });

  it('returns true for free fixer below credit limit', () => {
    expect(canApplyToJob({ role: 'fixer', plan: { creditsUsed: 2 } })).toBe(true);
  });

  it('returns false for free fixer at credit limit', () => {
    expect(canApplyToJob({ role: 'fixer', plan: { creditsUsed: FREE_CREDIT_LIMIT } })).toBe(false);
  });

  it('returns true for free fixer with no plan (0 credits used)', () => {
    expect(canApplyToJob({ role: 'fixer' })).toBe(true);
  });
});

describe('getRemainingApplications', () => {
  it('returns 0 for non-fixer', () => {
    expect(getRemainingApplications({ role: 'hirer' })).toBe(0);
    expect(getRemainingApplications(null)).toBe(0);
  });

  it('returns 0 for banned fixer', () => {
    expect(getRemainingApplications({ role: 'fixer', banned: true })).toBe(0);
  });

  it('returns unlimited for pro fixer', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(getRemainingApplications({ role: 'fixer', plan: { type: 'pro', status: 'active', endDate: future } })).toBe('unlimited');
  });

  it('returns remaining credits for free fixer', () => {
    expect(getRemainingApplications({ role: 'fixer', plan: { creditsUsed: 1 } })).toBe(2);
    expect(getRemainingApplications({ role: 'fixer', plan: { creditsUsed: 2 } })).toBe(1);
    expect(getRemainingApplications({ role: 'fixer', plan: { creditsUsed: 3 } })).toBe(0);
  });

  it('returns 0 when credits exceed limit (clamps to 0)', () => {
    expect(getRemainingApplications({ role: 'fixer', plan: { creditsUsed: 10 } })).toBe(0);
  });
});

describe('canPostJob', () => {
  it('returns false for non-hirer', () => {
    expect(canPostJob({ role: 'fixer' })).toBe(false);
    expect(canPostJob(null)).toBe(false);
  });

  it('returns false for banned hirer', () => {
    expect(canPostJob({ role: 'hirer', banned: true })).toBe(false);
  });

  it('returns true for pro hirer', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(canPostJob({ role: 'hirer', plan: { type: 'pro', status: 'active', endDate: future } })).toBe(true);
  });

  it('returns true when no previous job posted', () => {
    expect(canPostJob({ role: 'hirer' })).toBe(true);
  });

  it('returns false when last job posted less than 4 hours ago', () => {
    const recentTime = new Date(Date.now() - FOUR_HOURS_MS + 60_000).toISOString();
    expect(canPostJob({ role: 'hirer', lastJobPostedAt: recentTime })).toBe(false);
  });

  it('returns true when last job posted more than 4 hours ago', () => {
    const oldTime = new Date(Date.now() - FOUR_HOURS_MS - 1000).toISOString();
    expect(canPostJob({ role: 'hirer', lastJobPostedAt: oldTime })).toBe(true);
  });

  it('returns true when lastJobPostedAt is invalid date', () => {
    expect(canPostJob({ role: 'hirer', lastJobPostedAt: 'invalid-date' })).toBe(true);
  });
});

describe('getNextJobPostTime', () => {
  it('returns null for non-hirer', () => {
    expect(getNextJobPostTime({ role: 'fixer' })).toBeNull();
    expect(getNextJobPostTime(null)).toBeNull();
  });

  it('returns null for banned hirer', () => {
    expect(getNextJobPostTime({ role: 'hirer', banned: true })).toBeNull();
  });

  it('returns null for pro hirer', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(getNextJobPostTime({ role: 'hirer', plan: { type: 'pro', status: 'active', endDate: future } })).toBeNull();
  });

  it('returns null when hirer has never posted', () => {
    expect(getNextJobPostTime({ role: 'hirer' })).toBeNull();
  });

  it('returns next allowed time when within cooldown period', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = getNextJobPostTime({ role: 'hirer', lastJobPostedAt: twoHoursAgo.toISOString() });
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns null when cooldown has passed', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    expect(getNextJobPostTime({ role: 'hirer', lastJobPostedAt: fiveHoursAgo.toISOString() })).toBeNull();
  });
});

describe('getPlanStatus', () => {
  it('returns free/active defaults when user has no plan', () => {
    const result = getPlanStatus(null);
    expect(result.type).toBe('free');
    expect(result.status).toBe('active');
    expect(result.isActive).toBe(true);
    expect(result.isPro).toBe(false);
  });

  it('reflects pro plan status correctly', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const result = getPlanStatus({ role: 'fixer', plan: { type: 'pro', status: 'active', creditsUsed: 0, endDate: future } });
    expect(result.isPro).toBe(true);
    expect(result.isActive).toBe(true);
  });

  it('marks expired pro plan as not isPro', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const result = getPlanStatus({ role: 'fixer', plan: { type: 'pro', status: 'active', endDate: past } });
    expect(result.isPro).toBe(false);
  });

  it('reports creditsUsed from plan', () => {
    const result = getPlanStatus({ role: 'fixer', plan: { type: 'free', creditsUsed: 2 } });
    expect(result.creditsUsed).toBe(2);
  });
});

describe('isSubscriptionActive', () => {
  it('returns false for user without active pro plan', () => {
    expect(isSubscriptionActive(null)).toBe(false);
    expect(isSubscriptionActive({ role: 'fixer', plan: { type: 'free' } })).toBe(false);
  });

  it('returns true for user with active pro plan', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isSubscriptionActive({ role: 'fixer', plan: { type: 'pro', status: 'active', endDate: future } })).toBe(true);
  });
});

describe('isSubscriptionExpiringSoon', () => {
  it('returns false for inactive subscription', () => {
    expect(isSubscriptionExpiringSoon(null)).toBe(false);
  });

  it('returns true when subscription expires within 7 days', () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionExpiringSoon({ plan: { type: 'pro', status: 'active', endDate: soon } })).toBe(true);
  });

  it('returns false when subscription expires in more than 7 days', () => {
    const later = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionExpiringSoon({ plan: { type: 'pro', status: 'active', endDate: later } })).toBe(false);
  });

  it('returns false when subscription has already expired', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isSubscriptionExpiringSoon({ plan: { type: 'pro', status: 'active', endDate: past } })).toBe(false);
  });
});

describe('formatTimeRemaining', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatTimeRemaining(null)).toBe('');
    expect(formatTimeRemaining(undefined)).toBe('');
  });

  it('returns "Now" for past time', () => {
    const past = new Date(Date.now() - 1000);
    expect(formatTimeRemaining(past)).toBe('Now');
  });

  it('formats minutes only when under 1 hour', () => {
    const thirtyMinutes = new Date(Date.now() + 30 * 60 * 1000);
    expect(formatTimeRemaining(thirtyMinutes)).toBe('30m');
  });

  it('formats hours and minutes when over 1 hour', () => {
    const twoHoursThirty = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
    expect(formatTimeRemaining(twoHoursThirty)).toBe('2h 30m');
  });
});
