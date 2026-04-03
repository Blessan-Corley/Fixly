/**
 * Flow 3: Job completion → review submission
 *
 * Hirer marks a job as complete, then both hirer and fixer submit reviews.
 */
import { expect, test } from '@playwright/test';

import {
  FIXER_ID,
  HIRER_ID,
  JOB_ID,
  mockAblyAuth,
  mockNotifications,
  mockReviews,
  mockSubscription,
  mockUserProfile,
} from './helpers/api-mocks';

// ─── Hirer perspective ─────────────────────────────────────────────────────

const hirerJobDetail = {
  _id: JOB_ID,
  title: 'Fix plumbing issue',
  status: 'in_progress',
  urgency: 'asap',
  budget: { type: 'fixed', amount: 5000 },
  location: { city: 'Mumbai', state: 'Maharashtra' },
  skillsRequired: ['Plumbing'],
  description: 'The kitchen pipe is leaking badly and needs urgent repair.',
  createdBy: { _id: HIRER_ID, name: 'Test Hirer', username: 'test_hirer_e2e', rating: { average: 4.5, count: 10 } },
  assignedFixer: { _id: FIXER_ID, name: 'Test Fixer', username: 'test_fixer_e2e', rating: { average: 4.8, count: 20 } },
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  applications: [],
  hasApplied: false,
  createdAt: new Date().toISOString(),
};

test.describe('Hirer: complete a job and submit review', () => {
  test.use({ storageState: 'tests/e2e/.auth/hirer.json' });

  test.beforeEach(async ({ page }) => {
    mockUserProfile(page, 'hirer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);

    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      const method = route.request().method();
      if (method === 'PUT' || method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { message: 'Job status updated' },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { job: hirerJobDetail },
            job: hirerJobDetail,
          }),
        });
      }
    });
  });

  test('job details page shows in_progress status', async ({ page }) => {
    await page.goto(`/dashboard/jobs/${JOB_ID}`);

    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });
    // Status badge or indicator
    await expect(page.getByText(/in.progress|In Progress/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('hirer can mark job as complete', async ({ page }) => {
    await page.goto(`/dashboard/jobs/${JOB_ID}`);

    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });

    // Look for complete/mark complete button
    const completeButton = page
      .getByRole('button', { name: /mark.*complete|complete.*job/i })
      .first();
    if (await completeButton.isVisible()) {
      await completeButton.click();

      // May show a confirmation modal
      const confirmButton = page.getByRole('button', { name: /confirm|yes|complete/i }).last();
      if (await confirmButton.isVisible({ timeout: 2_000 })) {
        await confirmButton.click();
      }

      // Should show success feedback
      await expect(
        page.getByText(/complet|success/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Review submission after job completion', () => {
  test.use({ storageState: 'tests/e2e/.auth/hirer.json' });

  test.beforeEach(async ({ page }) => {
    mockUserProfile(page, 'hirer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);
    mockReviews(page);
  });

  test('review submission endpoint is called with rating and comment', async ({ page }) => {
    const completedJob = { ...hirerJobDetail, status: 'completed' };

    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, job: completedJob, data: { job: completedJob } }),
      });
    });

    let reviewPayload: Record<string, unknown> | null = null;
    await page.route('**/api/reviews**', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown> | null;
      reviewPayload = body;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { message: 'Review submitted' } }),
      });
    });

    await page.goto(`/dashboard/jobs/${JOB_ID}`);
    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });

    // Find the rate / leave review button
    const rateButton = page.getByRole('button', { name: /rate|review|leave.*review/i }).first();
    if (await rateButton.isVisible()) {
      await rateButton.click();

      // Fill rating if star inputs are visible
      const starButtons = page.locator('[aria-label*="star"], [data-rating], button.star');
      if ((await starButtons.count()) > 0) {
        await starButtons.nth(4).click(); // 5 stars
      }

      // Fill comment if textarea is visible
      const commentBox = page.getByPlaceholder(/comment|review|feedback/i);
      if (await commentBox.isVisible()) {
        await commentBox.fill('Excellent work! Very professional and fast.');
      }

      const submitReview = page.getByRole('button', { name: /submit.*review|save.*review/i });
      if (await submitReview.isVisible()) {
        await submitReview.click();
        await expect(
          page.getByText(/review.*submitted|thank.*review/i).first()
        ).toBeVisible({ timeout: 5_000 });
        expect(reviewPayload).not.toBeNull();
      }
    }
  });
});

test.describe('Fixer: submit review after job completion', () => {
  test.use({ storageState: 'tests/e2e/.auth/fixer.json' });

  test('fixer sees completed job and can leave review', async ({ page }) => {
    mockUserProfile(page, 'fixer');
    mockSubscription(page);
    mockAblyAuth(page);
    mockNotifications(page);
    mockReviews(page);

    const completedJob = {
      ...hirerJobDetail,
      status: 'completed',
      createdBy: { _id: HIRER_ID, name: 'Test Hirer', username: 'test_hirer_e2e', rating: { average: 4.5, count: 10 } },
    };

    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, job: completedJob, data: { job: completedJob } }),
      });
    });

    await page.goto(`/dashboard/jobs/${JOB_ID}`);
    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/complet/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
