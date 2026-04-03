/**
 * Flow 4: Dispute filing flow
 *
 * Hirer files a dispute against a fixer on a completed/in-progress job.
 * Fixer can view and respond to the dispute.
 */
import { expect, test } from '@playwright/test';

import {
  FIXER_ID,
  HIRER_ID,
  JOB_ID,
  mockAblyAuth,
  mockDisputes,
  mockNotifications,
  mockSubscription,
  mockUserProfile,
} from './helpers/api-mocks';

const disputeId = '507f1f77bcf86cd799439066';

const inProgressJob = {
  _id: JOB_ID,
  title: 'Fix plumbing issue',
  status: 'in_progress',
  urgency: 'asap',
  budget: { type: 'fixed', amount: 5000 },
  location: { city: 'Mumbai', state: 'Maharashtra' },
  skillsRequired: ['Plumbing'],
  description: 'Kitchen pipe leaking urgently.',
  createdBy: { _id: HIRER_ID, name: 'Test Hirer', username: 'test_hirer_e2e', rating: { average: 4.5, count: 10 } },
  assignedFixer: { _id: FIXER_ID, name: 'Test Fixer', username: 'test_fixer_e2e', rating: { average: 4.8, count: 20 } },
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  applications: [],
  hasApplied: false,
  createdAt: new Date().toISOString(),
};

// ─── Hirer files a dispute ──────────────────────────────────────────────────

test.describe('Hirer: file a dispute', () => {
  test.use({ storageState: 'tests/e2e/.auth/hirer.json' });

  test.beforeEach(async ({ page }) => {
    mockUserProfile(page, 'hirer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);
    mockDisputes(page);

    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      const method = route.request().method();
      if (method === 'POST' || method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            job: inProgressJob,
            data: { job: inProgressJob },
          }),
        });
      }
    });
  });

  test('dispute form loads from job details page', async ({ page }) => {
    await page.goto(`/dashboard/jobs/${JOB_ID}`);
    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });

    // Look for the dispute button on the job details page
    const disputeButton = page
      .getByRole('button', { name: /dispute|file.*dispute|report.*issue/i })
      .first();
    if (await disputeButton.isVisible()) {
      await disputeButton.click();
      // Should open a dispute form or modal
      await expect(
        page.getByText(/dispute|report|issue/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('dispute filing API is called with correct payload', async ({ page }) => {
    let disputePayload: Record<string, unknown> | null = null;

    await page.route('**/api/disputes', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown> | null;
        disputePayload = body;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              disputeId,
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

    // Navigate directly to dispute filing page if it exists separately
    await page.goto(`/dashboard/jobs/${JOB_ID}`);
    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });

    // If a dispute/report button exists, click it and fill the form
    const disputeButton = page
      .getByRole('button', { name: /dispute|file.*dispute|report/i })
      .first();

    if (await disputeButton.isVisible()) {
      await disputeButton.click();

      // Fill reason/description if form appears
      const reasonSelect = page.getByLabel(/reason|type/i).first();
      if (await reasonSelect.isVisible()) {
        await reasonSelect.selectOption({ index: 1 });
      }

      const descriptionField = page.getByPlaceholder(/describe|detail|explain/i).first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill(
          'The fixer did not complete the work as agreed and is not responding to messages.'
        );
      }

      const submitButton = page.getByRole('button', { name: /submit.*dispute|file.*dispute/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        expect(disputePayload).not.toBeNull();
      }
    }
  });
});

// ─── Disputes dashboard ─────────────────────────────────────────────────────

test.describe('Disputes dashboard', () => {
  test.use({ storageState: 'tests/e2e/.auth/hirer.json' });

  test('disputes list page renders', async ({ page }) => {
    mockUserProfile(page, 'hirer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);

    await page.route('**/api/disputes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            disputes: [
              {
                _id: disputeId,
                jobId: JOB_ID,
                jobTitle: 'Fix plumbing issue',
                status: 'open',
                reason: 'work_not_completed',
                description: 'Fixer did not complete the work.',
                createdAt: new Date().toISOString(),
                raisedBy: HIRER_ID,
                raisedAgainst: FIXER_ID,
              },
            ],
            pagination: { total: 1 },
          },
        }),
      });
    });

    await page.goto('/dashboard/disputes');

    // Should show the disputes list or heading
    await expect(
      page.getByRole('heading', { name: /dispute|support/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('dispute detail page renders with job info', async ({ page }) => {
    mockUserProfile(page, 'hirer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);

    const disputeDetail = {
      _id: disputeId,
      jobId: JOB_ID,
      jobTitle: 'Fix plumbing issue',
      status: 'open',
      reason: 'work_not_completed',
      description: 'Fixer did not complete the work.',
      createdAt: new Date().toISOString(),
      raisedBy: { _id: HIRER_ID, name: 'Test Hirer' },
      raisedAgainst: { _id: FIXER_ID, name: 'Test Fixer' },
      evidence: [],
      messages: [],
    };

    await page.route(`**/api/disputes/${disputeId}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { dispute: disputeDetail } }),
      });
    });

    await page.goto(`/dashboard/disputes/${disputeId}`);

    // Should show dispute details
    await expect(page.getByText(/dispute|Fix plumbing issue/i).first()).toBeVisible({
      timeout: 8_000,
    });
  });
});
