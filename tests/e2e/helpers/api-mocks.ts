import type { Page } from '@playwright/test';

export const HIRER_ID = '507f1f77bcf86cd799439011';
export const FIXER_ID = '507f1f77bcf86cd799439022';
export const JOB_ID = '507f1f77bcf86cd799439033';
export const APP_ID = '507f1f77bcf86cd799439044';
export const CONVERSATION_ID = '507f1f77bcf86cd799439055';

export function mockUserProfile(page: Page, role: 'hirer' | 'fixer'): void {
  const userId = role === 'hirer' ? HIRER_ID : FIXER_ID;
  const userData = {
    _id: userId,
    id: userId,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    email: `test-${role}@fixly-e2e.test`,
    username: `test_${role}_e2e`,
    role,
    isRegistered: true,
    banned: false,
    isActive: true,
    deleted: false,
    authMethod: 'email',
    csrfToken: 'e2e-csrf-test-token',
    plan: { type: 'free', status: 'active', creditsUsed: 0 },
    skills: role === 'fixer' ? ['Plumbing', 'Carpentry'] : [],
    rating: { average: 4.5, count: 12 },
    reviewCount: 12,
    verificationStatus: 'verified',
  };

  void page.route('**/api/user/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: userData }),
    });
  });
}

export function mockSubscription(page: Page): void {
  void page.route('**/api/subscription**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          plan: { type: 'free', status: 'active', isActive: false },
          features: { canPostJobs: true, maxJobPosts: 3 },
        },
      }),
    });
  });
}

export function mockContentValidation(page: Page): void {
  void page.route('**/api/validate-content', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isValid: true, violations: [] }),
    });
  });
}

export function mockDrafts(page: Page): void {
  void page.route('**/api/jobs/drafts**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { drafts: [] } }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { draftId: 'draft-e2e-001' },
        }),
      });
    }
  });
}

export function mockJobPost(page: Page): void {
  void page.route('**/api/jobs/post', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { jobId: JOB_ID, message: 'Job posted successfully' },
      }),
    });
  });
}

export function mockJobDetails(page: Page, opts: { hasApplications?: boolean } = {}): void {
  const job = {
    _id: JOB_ID,
    title: 'Fix plumbing issue',
    description: 'The kitchen pipe is leaking badly and needs urgent repair.',
    status: opts.hasApplications ? 'open' : 'open',
    urgency: 'asap',
    budget: { type: 'fixed', amount: 5000 },
    location: { city: 'Mumbai', state: 'Maharashtra' },
    skillsRequired: ['Plumbing'],
    createdBy: {
      _id: HIRER_ID,
      name: 'Test Hirer',
      username: 'test_hirer_e2e',
      rating: { average: 4.5, count: 10 },
    },
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    applications: opts.hasApplications
      ? [
          {
            _id: APP_ID,
            fixer: {
              _id: FIXER_ID,
              name: 'Test Fixer',
              username: 'test_fixer_e2e',
              rating: { average: 4.8, count: 20 },
            },
            status: 'pending',
            proposedAmount: 4500,
            description: 'I am experienced in plumbing and can fix this quickly.',
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
    hasApplied: false,
    createdAt: new Date().toISOString(),
  };

  void page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { job }, job }),
    });
  });
}

export function mockAcceptApplication(page: Page): void {
  void page.route(`**/api/jobs/${JOB_ID}/applications/${APP_ID}/accept`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { message: 'Application accepted' },
      }),
    });
  });
}

export function mockJobsList(page: Page): void {
  const jobs = [
    {
      _id: JOB_ID,
      title: 'Fix plumbing issue',
      description: 'The kitchen pipe is leaking badly.',
      urgency: 'asap',
      budget: { type: 'fixed', amount: 5000 },
      location: { city: 'Mumbai', state: 'Maharashtra', lat: 19.07, lng: 72.87 },
      skillsRequired: ['Plumbing'],
      applications: [],
      applicationCount: 0,
      hasApplied: false,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      views: { count: 5 },
    },
  ];

  void page.route('**/api/jobs/browse**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          jobs,
          pagination: { page: 1, total: 1, hasMore: false },
        },
        jobs,
        pagination: { page: 1, total: 1, hasMore: false },
      }),
    });
  });
}

export function mockApplyToJob(page: Page): void {
  void page.route(`**/api/jobs/${JOB_ID}/apply`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { message: 'Application submitted successfully' },
      }),
    });
  });
}

export function mockUserJobs(page: Page, opts: { status?: string } = {}): void {
  const job = {
    _id: JOB_ID,
    title: 'Fix plumbing issue',
    status: opts.status ?? 'in_progress',
    budget: { type: 'fixed', amount: 5000 },
    location: { city: 'Mumbai', state: 'Maharashtra' },
    createdAt: new Date().toISOString(),
    assignedFixer: {
      _id: FIXER_ID,
      name: 'Test Fixer',
      username: 'test_fixer_e2e',
    },
  };

  void page.route('**/api/jobs**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { jobs: [job], pagination: { total: 1 } },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}

export function mockReviews(page: Page): void {
  void page.route('**/api/reviews**', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { message: 'Review submitted successfully' },
      }),
    });
  });
}

export function mockDisputes(page: Page): void {
  void page.route('**/api/disputes**', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            disputeId: '507f1f77bcf86cd799439066',
            message: 'Dispute filed successfully',
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { disputes: [] } }),
      });
    }
  });
}

export function mockConversations(page: Page): void {
  const conversation = {
    _id: CONVERSATION_ID,
    participants: [
      { _id: HIRER_ID, name: 'Test Hirer', username: 'test_hirer_e2e' },
      { _id: FIXER_ID, name: 'Test Fixer', username: 'test_fixer_e2e' },
    ],
    lastMessage: { content: 'Hello!', createdAt: new Date().toISOString() },
    unreadCount: 0,
    jobTitle: 'Fix plumbing issue',
    jobId: JOB_ID,
    updatedAt: new Date().toISOString(),
  };

  void page.route('**/api/conversations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          conversations: [conversation],
          messages: [],
          pagination: { total: 1 },
        },
      }),
    });
  });

  void page.route('**/api/messages**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            messages: [
              {
                _id: '507f1f77bcf86cd799439077',
                content: 'Hello! I saw your job posting.',
                sender: { _id: FIXER_ID, name: 'Test Fixer' },
                createdAt: new Date().toISOString(),
                read: true,
              },
            ],
            pagination: { total: 1 },
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            _id: '507f1f77bcf86cd799439088',
            content: 'Message sent',
            sender: HIRER_ID,
          },
        }),
      });
    }
  });
}

export function mockAblyAuth(page: Page): void {
  void page.route('**/api/ably/auth**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        keyName: 'test-key',
        timestamp: Date.now(),
        nonce: 'test-nonce',
        capability: '{"*":["*"]}',
        mac: 'test-mac',
      }),
    });
  });
}

export function mockNotifications(page: Page): void {
  void page.route('**/api/notifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { notifications: [], unreadCount: 0 },
      }),
    });
  });
}
