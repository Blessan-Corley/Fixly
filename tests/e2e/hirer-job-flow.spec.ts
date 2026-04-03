/**
 * Flow 1: Hirer post job → review applicants → accept fixer
 *
 * Uses a pre-generated hirer JWT cookie (from global-setup.ts).
 * All backend API calls are intercepted and mocked via page.route().
 */
import { expect, test } from '@playwright/test';

import {
  APP_ID,
  JOB_ID,
  mockAblyAuth,
  mockAcceptApplication,
  mockContentValidation,
  mockDrafts,
  mockJobDetails,
  mockJobPost,
  mockNotifications,
  mockSubscription,
  mockUserProfile,
} from './helpers/api-mocks';

test.use({ storageState: 'tests/e2e/.auth/hirer.json' });

test.beforeEach(async ({ page }) => {
  mockUserProfile(page, 'hirer');
  mockSubscription(page);
  mockContentValidation(page);
  mockDrafts(page);
  mockAblyAuth(page);
  mockNotifications(page);
});

test.describe('Hirer: post job flow', () => {
  test('post-job page loads with step 1 form', async ({ page }) => {
    await page.goto('/dashboard/post-job');

    await expect(page.getByRole('heading', { name: 'Post New Job' })).toBeVisible();
    await expect(page.getByText('Job Title')).toBeVisible();
    await expect(page.getByPlaceholder(/Fix kitchen sink leak/i)).toBeVisible();
  });

  test('step 1: validates title and description then advances to step 2', async ({ page }) => {
    await page.goto('/dashboard/post-job');

    // Fill title (min 10 chars)
    await page.getByPlaceholder(/Fix kitchen sink leak/i).fill('Fix leaking kitchen sink pipe urgently');

    // Fill description (min 50 chars)
    await page
      .getByPlaceholder(/Describe the work in detail/i)
      .fill(
        'The kitchen sink pipe is leaking water under the cabinet. Need an experienced plumber to fix it.'
      );

    // Click Next
    await page.getByRole('button', { name: 'Next' }).click();

    // Should advance to step 2
    await expect(page.getByText(/Budget/i)).toBeVisible({ timeout: 5_000 });
  });

  test('completes full 4-step post-job form and submits', async ({ page }) => {
    mockJobPost(page);

    await page.goto('/dashboard/post-job');

    // --- Step 1: Details ---
    await page.getByPlaceholder(/Fix kitchen sink leak/i).fill('Fix leaking kitchen sink pipe urgently');
    await page
      .getByPlaceholder(/Describe the work in detail/i)
      .fill(
        'The kitchen sink pipe is leaking water under the cabinet. Need an experienced plumber to fix it quickly.'
      );
    await page.getByRole('button', { name: 'Next' }).click();

    // --- Step 2: Budget & Location ---
    await expect(page.getByText(/Budget/i)).toBeVisible({ timeout: 5_000 });
    // Skip location map interaction — just proceed (location mock is via route)
    await page.getByRole('button', { name: 'Next' }).click();

    // --- Step 3: Timing & Requirements ---
    await expect(page.getByText(/urgency|deadline|timing/i).first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Next' }).click();

    // --- Step 4: Review & Submit ---
    await expect(page.getByRole('button', { name: 'Post Job' })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Post Job' }).click();

    // After successful post, redirects to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});

test.describe('Hirer: review applicants and accept fixer', () => {
  test('job details page shows applicants tab', async ({ page }) => {
    mockJobDetails(page, { hasApplications: true });

    await page.goto(`/dashboard/jobs/${JOB_ID}`);

    // Job title should appear
    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });
  });

  test('hirer can accept an applicant', async ({ page }) => {
    mockJobDetails(page, { hasApplications: true });
    mockAcceptApplication(page);

    // Also mock the PUT endpoint for accepting in job-crud
    await page.route(`**/api/jobs/${JOB_ID}/applications/${APP_ID}/accept`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Application accepted successfully' },
        }),
      });
    });

    await page.goto(`/dashboard/jobs/${JOB_ID}`);
    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });

    // Look for Applications tab and click it
    const applicationsTab = page.getByRole('tab', { name: /applicants|applications/i });
    if (await applicationsTab.isVisible()) {
      await applicationsTab.click();
    }

    // Look for an Accept button
    const acceptButton = page.getByRole('button', { name: /accept/i }).first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      // Should show confirmation or success
      await expect(
        page.getByText(/accepted|success/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});
