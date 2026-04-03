/**
 * Flow 2: Fixer signup → browse jobs → apply → accepted → message hirer
 *
 * Uses a pre-generated fixer JWT cookie (from global-setup.ts).
 * All backend API calls are intercepted and mocked via page.route().
 */
import { expect, test } from '@playwright/test';

import {
  FIXER_ID,
  JOB_ID,
  mockAblyAuth,
  mockApplyToJob,
  mockJobsList,
  mockNotifications,
  mockSubscription,
  mockUserProfile,
} from './helpers/api-mocks';

test.use({ storageState: 'tests/e2e/.auth/fixer.json' });

test.beforeEach(async ({ page }) => {
  mockUserProfile(page, 'fixer');
  mockSubscription(page);
  mockAblyAuth(page);
  mockNotifications(page);
});

test.describe('Fixer: browse jobs', () => {
  test('browse-jobs page loads with search bar and job list', async ({ page }) => {
    mockJobsList(page);

    await page.goto('/dashboard/browse-jobs');

    await expect(page.getByRole('heading', { name: 'Find Jobs' })).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByPlaceholder(/Search jobs by title/i)
    ).toBeVisible();
  });

  test('shows available jobs from API', async ({ page }) => {
    mockJobsList(page);

    await page.goto('/dashboard/browse-jobs');

    // The job from the mock should appear
    await expect(page.getByText('Fix plumbing issue')).toBeVisible({ timeout: 8_000 });
  });

  test('shows application credits remaining', async ({ page }) => {
    mockJobsList(page);

    await page.goto('/dashboard/browse-jobs');

    // Fixer with free plan should see remaining credits
    await expect(page.getByText(/applications remaining/i)).toBeVisible({ timeout: 8_000 });
  });

  test('filter panel opens and closes', async ({ page }) => {
    mockJobsList(page);

    await page.goto('/dashboard/browse-jobs');

    await expect(page.getByRole('heading', { name: 'Find Jobs' })).toBeVisible({ timeout: 8_000 });

    const filtersButton = page.getByRole('button', { name: /Filters/i });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();

    // After opening filters, filter options should appear
    await expect(page.getByText(/Budget Range/i)).toBeVisible();

    // Close by clicking again
    await filtersButton.click();
    await expect(page.getByText(/Budget Range/i)).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Fixer: apply to a job', () => {
  test('apply page loads for a valid job', async ({ page }) => {
    // Mock the job fetch used by the apply page
    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          job: {
            _id: JOB_ID,
            title: 'Fix plumbing issue',
            budget: { type: 'fixed', amount: 5000 },
            createdBy: {
              name: 'Test Hirer',
              rating: { average: 4.5, count: 10 },
            },
            hasApplied: false,
            skillsRequired: ['Plumbing'],
            applications: [],
          },
        }),
      });
    });

    await page.goto(`/dashboard/jobs/${JOB_ID}/apply`);

    await expect(page.getByRole('heading', { name: 'Apply to Job' })).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByText('Fix plumbing issue')).toBeVisible();
  });

  test('application form validates required fields', async ({ page }) => {
    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          job: {
            _id: JOB_ID,
            title: 'Fix plumbing issue',
            budget: { type: 'fixed', amount: 5000 },
            createdBy: { name: 'Test Hirer', rating: { average: null, count: 0 } },
            hasApplied: false,
            skillsRequired: [],
            applications: [],
          },
        }),
      });
    });

    await page.goto(`/dashboard/jobs/${JOB_ID}/apply`);
    await expect(page.getByRole('heading', { name: 'Apply to Job' })).toBeVisible({
      timeout: 8_000,
    });

    // Submit without filling required fields
    const submitButton = page.getByRole('button', { name: /Submit Proposal/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Should show validation error (not navigate away)
    await expect(page).toHaveURL(new RegExp(`/apply`));
  });

  test('submits application with valid data', async ({ page }) => {
    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      if (route.request().url().includes('/apply')) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          job: {
            _id: JOB_ID,
            title: 'Fix plumbing issue',
            budget: { type: 'fixed', amount: 5000 },
            createdBy: { name: 'Test Hirer', rating: { average: 4.5, count: 8 } },
            hasApplied: false,
            skillsRequired: ['Plumbing'],
            applications: [],
          },
        }),
      });
    });
    mockApplyToJob(page);

    await page.goto(`/dashboard/jobs/${JOB_ID}/apply`);
    await expect(page.getByRole('heading', { name: 'Apply to Job' })).toBeVisible({
      timeout: 8_000,
    });

    // Fill proposed amount
    const amountInput = page.getByPlaceholder(/Enter your proposed amount/i);
    await amountInput.fill('4500');

    // Fill cover letter description
    const descriptionTextarea = page.getByPlaceholder(/Briefly explain why you're fit/i);
    await descriptionTextarea.fill(
      'I am an experienced plumber with 5 years of expertise. I can fix this pipe issue quickly and professionally.'
    );

    // Submit
    await page.getByRole('button', { name: /Submit Proposal/i }).click();

    // Should redirect to applications dashboard after success
    await expect(page).toHaveURL(/\/dashboard\/applications/, { timeout: 8_000 });
  });

  test('shows already-applied state when fixer has applied', async ({ page }) => {
    await page.route(`**/api/jobs/${JOB_ID}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          job: {
            _id: JOB_ID,
            title: 'Fix plumbing issue',
            budget: { type: 'fixed', amount: 5000 },
            createdBy: { name: 'Test Hirer', rating: { average: null, count: 0 } },
            hasApplied: true,
            skillsRequired: [],
            applications: [{ fixer: FIXER_ID }],
          },
        }),
      });
    });

    await page.goto(`/dashboard/jobs/${JOB_ID}/apply`);

    await expect(
      page.getByRole('heading', { name: /Application Already Submitted/i })
    ).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /View Applications/i })).toBeVisible();
  });
});
