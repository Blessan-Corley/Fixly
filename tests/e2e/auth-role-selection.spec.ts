import { expect, test } from '@playwright/test';

test.describe('signup role entry', () => {
  test('routes hirer CTA directly to role-aware signup', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'I Need a Service' }).click();

    await expect(page).toHaveURL(/\/auth\/signup\?role=hirer/);
    await expect(page.getByRole('heading', { name: 'Welcome Hirer' })).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });

  test('routes fixer selection from the modal to role-aware signup', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.getByRole('button', { name: "I'm a Fixer" }).click();

    await expect(page).toHaveURL(/\/auth\/signup\?role=fixer/);
    await expect(page.getByRole('heading', { name: 'Welcome Fixer' })).toBeVisible();
  });
});
