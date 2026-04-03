import { expect, test } from '@playwright/test';

const savedEmailDraft = {
  version: 1,
  authMethod: 'email',
  currentStep: 2,
  updatedAt: Date.now(),
  formData: {
    role: 'fixer',
    name: 'Saved Fixer',
    username: 'saved_fixer',
    email: 'saved@example.com',
    phone: '9876543210',
    address: null,
    skills: [],
    termsAccepted: false,
  },
};

test.describe('signup resume flow', () => {
  test('shows a saved signup draft on the landing page and resumes it', async ({ page }) => {
    await page.addInitScript((draft) => {
      window.localStorage.setItem('fixly-signup-draft', JSON.stringify(draft));
    }, savedEmailDraft);

    await page.goto('/');

    await expect(
      page.getByText('There is an unfinished account setup waiting for you.')
    ).toBeVisible();

    await page.getByRole('button', { name: 'Continue creating account' }).click();

    await expect(page).toHaveURL(/\/auth\/signup\?role=fixer&method=email/);
    await expect(page.getByPlaceholder('you@example.com')).toHaveValue('saved@example.com');
    await expect(page.getByPlaceholder('Create a strong password')).toBeVisible();
  });

  test('can discard a saved draft and restart signup from the beginning', async ({ page }) => {
    await page.addInitScript((draft) => {
      window.localStorage.setItem('fixly-signup-draft', JSON.stringify(draft));
    }, savedEmailDraft);

    await page.goto('/');

    await page.getByRole('button', { name: 'Start over from the beginning' }).click();

    await expect(page).toHaveURL(/\/auth\/signup$/);
    await expect(page.getByRole('heading', { name: 'Welcome to Fixly' })).toBeVisible();

    const draftValue = await page.evaluate(() => window.localStorage.getItem('fixly-signup-draft'));
    expect(draftValue).toBeNull();
  });

  test('keeps incomplete authenticated users on the landing page until they choose to resume', async ({
    page,
  }) => {
    await page.route('**/api/auth/session*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'pending_google:google-user-123',
            email: 'fixer@example.com',
            name: 'Pending Fixer',
            role: 'fixer',
            username: 'tmp_fixer',
            authMethod: 'google',
            isRegistered: false,
            needsOnboarding: true,
          },
          expires: '2099-01-01T00:00:00.000Z',
        }),
      });
    });

    await page.goto('/');

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByText('There is an unfinished account setup waiting for you.')
    ).toBeVisible();

    await page.getByRole('button', { name: 'Continue creating account' }).click();

    await expect(page).toHaveURL(/\/auth\/signup\?role=fixer&method=google/);
    await expect(page.getByRole('heading', { name: 'Profile details' })).toBeVisible();
  });
});
