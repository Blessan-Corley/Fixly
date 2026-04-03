import { expect, test } from '@playwright/test';

test.describe('signup validation', () => {
  test('keeps the primary button disabled until role and auth method are selected', async ({
    page,
  }) => {
    await page.goto('/auth/signup?role=fixer');

    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });

    await expect(continueButton).toBeDisabled();

    await page.getByRole('button', { name: 'Continue with Email' }).click();

    await expect(continueButton).toBeEnabled();
  });

  test('requires OTP verification before the credentials step can continue', async ({ page }) => {
    await page.route('**/api/auth/send-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OTP sent to email',
        }),
      });
    });

    await page.route('**/api/auth/verify-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OTP verified',
        }),
      });
    });

    await page.goto('/auth/signup?role=fixer');

    await page.getByRole('button', { name: 'Continue with Email' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    const sendCodeButton = page.getByRole('button', { name: 'Send code' });

    await expect(continueButton).toBeDisabled();
    await expect(sendCodeButton).toBeDisabled();

    await page.getByPlaceholder('you@example.com').fill('fixer@example.com');
    await page.getByPlaceholder('Create a strong password').fill('StrongPass1!');
    await page.getByPlaceholder('Re-enter your password').fill('StrongPass1!');

    await expect(sendCodeButton).toBeEnabled();
    await expect(continueButton).toBeDisabled();

    await sendCodeButton.click();
    await expect(page.getByText('Code sent to fixer@example.com')).toBeVisible();

    await page.getByLabel('OTP digit 1').fill('1');
    await page.getByLabel('OTP digit 2').fill('2');
    await page.getByLabel('OTP digit 3').fill('3');
    await page.getByLabel('OTP digit 4').fill('4');
    await page.getByLabel('OTP digit 5').fill('5');
    await page.getByLabel('OTP digit 6').fill('6');

    await page.getByRole('button', { name: 'Verify email' }).click();

    await expect(page.getByText('Email verified successfully.')).toBeVisible();
    await expect(continueButton).toBeEnabled();
  });
});
