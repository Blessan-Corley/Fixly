import { expect, test } from '@playwright/test';

test.describe('authentication recovery flows', () => {
  test('navigates from signin to forgot-password', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.getByRole('button', { name: 'Forgot your password?' }).click();

    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  });

  test('completes forgot-password flow with verification and redirects to signin', async ({
    page,
  }) => {
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Verification code sent',
          expiresIn: 300,
        }),
      });
    });

    await page.route('**/api/auth/verify-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Verified',
        }),
      });
    });

    await page.route('**/api/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Password reset successful',
        }),
      });
    });

    await page.goto('/auth/forgot-password');

    const emailInput = page.locator('input[placeholder="Enter your Fixly email"]').first();
    await page.waitForSelector('input[placeholder="Enter your Fixly email"]', { state: 'visible' });
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.type('person@example.com', { delay: 20 });
    await expect(emailInput).toHaveValue('person@example.com');

    const sendCodeButton = page.getByRole('button', { name: 'Send reset code' });
    await expect(sendCodeButton).toBeEnabled();
    await sendCodeButton.click();

    await expect(page.getByRole('heading', { name: 'Verify Reset Code' })).toBeVisible();
    const otpInputs = page.locator('input[aria-label^="OTP digit"]');
    await expect(otpInputs).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await otpInputs.nth(index).fill(String(index + 1));
    }
    await page.getByRole('button', { name: 'Verify code' }).click();

    await expect(page.getByRole('heading', { name: 'Choose a New Password' })).toBeVisible();
    await page.getByPlaceholder('Create a new password').fill('StrongPass1!');
    await page.getByPlaceholder('Confirm your password').fill('StrongPass1!');
    await page.getByRole('button', { name: 'Reset password' }).click();

    await expect(page).toHaveURL(/\/auth\/signin\?message=password_reset_success/);
  });
});
