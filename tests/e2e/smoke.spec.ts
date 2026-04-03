import { expect, test } from '@playwright/test';

test.describe('marketing homepage', () => {
  test('opens the landing page and shows the role picker flow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Find Local Service/i })).toBeVisible();

    await expect(page.locator('body')).toContainText('Get Started');
    await expect(page.locator('body')).toContainText('I Need a Service');
    await expect(page.locator('body')).toContainText("I'm a Service Provider");

    await page.getByRole('button', { name: 'Get Started' }).click({ timeout: 15_000 });

    await expect(page.getByRole('heading', { name: 'Choose Your Role' })).toBeVisible();
    await expect(page.getByRole('button', { name: "I'm a Hirer" })).toBeVisible();
    await expect(page.getByRole('button', { name: "I'm a Fixer" })).toBeVisible();
  });
});
