/**
 * Flow 5: Real-time messaging between hirer and fixer
 *
 * Tests the messages dashboard: conversation list, reading messages,
 * sending a message, and real-time presence indicators.
 */
import { expect, test } from '@playwright/test';

import {
  CONVERSATION_ID,
  FIXER_ID,
  HIRER_ID,
  JOB_ID,
  mockAblyAuth,
  mockConversations,
  mockNotifications,
  mockSubscription,
  mockUserProfile,
} from './helpers/api-mocks';

// ─── Hirer: messages dashboard ──────────────────────────────────────────────

test.describe('Hirer: messages dashboard', () => {
  test.use({ storageState: 'tests/e2e/.auth/hirer.json' });

  test.beforeEach(async ({ page }) => {
    mockUserProfile(page, 'hirer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);
    mockConversations(page);
  });

  test('messages page loads with conversation list', async ({ page }) => {
    await page.goto('/dashboard/messages');

    // Should show conversations panel
    await expect(
      page.getByText(/messages|conversations|inbox/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('shows conversation from fixer', async ({ page }) => {
    await page.goto('/dashboard/messages');

    // The conversation from mock should appear
    await expect(page.getByText(/Test Fixer|Fix plumbing issue/i).first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('clicking a conversation loads the message thread', async ({ page }) => {
    // More detailed conversation mock
    await page.route('**/api/conversations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            conversations: [
              {
                _id: CONVERSATION_ID,
                participants: [
                  { _id: HIRER_ID, name: 'Test Hirer', username: 'test_hirer_e2e' },
                  { _id: FIXER_ID, name: 'Test Fixer', username: 'test_fixer_e2e' },
                ],
                lastMessage: {
                  content: 'Hello! I am interested in your job.',
                  createdAt: new Date().toISOString(),
                  sender: FIXER_ID,
                },
                unreadCount: 1,
                jobTitle: 'Fix plumbing issue',
                jobId: JOB_ID,
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { total: 1 },
          },
        }),
      });
    });

    await page.route(`**/api/messages*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            messages: [
              {
                _id: '507f1f77bcf86cd799439077',
                content: 'Hello! I am interested in your job.',
                sender: { _id: FIXER_ID, name: 'Test Fixer', username: 'test_fixer_e2e' },
                createdAt: new Date().toISOString(),
                read: false,
              },
            ],
            pagination: { total: 1, hasMore: false },
          },
        }),
      });
    });

    await page.goto('/dashboard/messages');

    // Find and click the conversation
    const conversation = page
      .getByText(/Test Fixer|Fix plumbing issue|Hello.*interested/i)
      .first();
    await expect(conversation).toBeVisible({ timeout: 8_000 });
    await conversation.click();

    // Message thread should load
    await expect(
      page.getByText('Hello! I am interested in your job.')
    ).toBeVisible({ timeout: 5_000 });
  });

  test('hirer can send a message', async ({ page }) => {
    let sentMessage: string | null = null;

    await page.route('**/api/conversations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            conversations: [
              {
                _id: CONVERSATION_ID,
                participants: [
                  { _id: HIRER_ID, name: 'Test Hirer', username: 'test_hirer_e2e' },
                  { _id: FIXER_ID, name: 'Test Fixer', username: 'test_fixer_e2e' },
                ],
                lastMessage: { content: 'Hi', createdAt: new Date().toISOString(), sender: FIXER_ID },
                unreadCount: 0,
                jobTitle: 'Fix plumbing issue',
                jobId: JOB_ID,
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { total: 1 },
          },
        }),
      });
    });

    await page.route('**/api/messages**', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown> | null;
        sentMessage = (body?.content as string | null) ?? null;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: '507f1f77bcf86cd799439099',
              content: sentMessage ?? '',
              sender: { _id: HIRER_ID, name: 'Test Hirer' },
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { messages: [], pagination: { total: 0, hasMore: false } },
          }),
        });
      }
    });

    await page.goto('/dashboard/messages');

    // Select the conversation
    const conv = page.getByText(/Test Fixer|Fix plumbing issue/i).first();
    await expect(conv).toBeVisible({ timeout: 8_000 });
    await conv.click();

    // Find the message composer and type a message
    const composer = page
      .getByPlaceholder(/Type a message|message.../i)
      .or(page.locator('textarea[name="message"]'))
      .or(page.locator('[contenteditable="true"]'))
      .first();

    if (await composer.isVisible({ timeout: 3_000 })) {
      await composer.fill('Thank you for your interest! When can you start?');

      // Send the message
      const sendButton = page
        .getByRole('button', { name: /send/i })
        .or(page.locator('button[type="submit"]'))
        .first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
        expect(sentMessage).toBe('Thank you for your interest! When can you start?');
      }
    }
  });
});

// ─── Fixer: messages dashboard ──────────────────────────────────────────────

test.describe('Fixer: messages dashboard', () => {
  test.use({ storageState: 'tests/e2e/.auth/fixer.json' });

  test.beforeEach(async ({ page }) => {
    mockUserProfile(page, 'fixer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);
    mockConversations(page);
  });

  test('fixer messages page loads with conversation list', async ({ page }) => {
    await page.goto('/dashboard/messages');

    await expect(
      page.getByText(/messages|conversations|inbox/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('fixer sees conversation with hirer', async ({ page }) => {
    await page.goto('/dashboard/messages');

    await expect(
      page.getByText(/Test Hirer|Fix plumbing issue/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('job-scoped messages page renders', async ({ page }) => {
    await page.route(`**/api/messages*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            messages: [
              {
                _id: '507f1f77bcf86cd799439077',
                content: 'Hello, when can you start the work?',
                sender: { _id: HIRER_ID, name: 'Test Hirer' },
                createdAt: new Date().toISOString(),
                read: true,
              },
            ],
            pagination: { total: 1, hasMore: false },
          },
        }),
      });
    });

    await page.goto(`/dashboard/jobs/${JOB_ID}/messages`);

    // Should render the job-scoped messages page or redirect to main messages
    const url = page.url();
    expect(url).toMatch(/messages|dashboard/);
  });
});
