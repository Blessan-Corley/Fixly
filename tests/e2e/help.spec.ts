import { expect, test } from '@playwright/test';

test.describe('help center', () => {
  test('renders a deep-linked article correctly', async ({ page }) => {
    await page.goto('/help?category=getting-started&article=create-account');

    await expect(page.getByRole('button', { name: /Back to Getting Started/i })).toBeVisible();
    await expect(page.getByText('Creating Your Fixly Account')).toBeVisible();
    await expect(page.getByText('Step 1: Choose Your Role')).toBeVisible();
  });

  test('search finds onboarding guidance without reloading the page', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'How can we help you?' })).toBeVisible();

    await page.getByPlaceholder('Search for help...').fill('create account');

    await expect(page.getByRole('heading', { name: /Search Results/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How to Create an Account' })).toBeVisible();
  });
});
