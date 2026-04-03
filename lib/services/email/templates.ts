import { env } from '@/lib/env';

function getBaseUrl(): string {
  return env.NEXTAUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export function buildOtpTemplate(type: string, otp: string): { subject: string; html: string } {
  const normalizedType = type.trim().toLowerCase();

  if (normalizedType === 'password_reset') {
    return {
      subject: 'Fixly password reset code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password reset request</h2>
          <p>Use this code to reset your password:</p>
          <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700;">${otp}</p>
          <p>This code expires in 5 minutes.</p>
        </div>
      `.trim(),
    };
  }

  return {
    subject: 'Fixly verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your account</h2>
        <p>Use this code to continue:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700;">${otp}</p>
        <p>This code expires in 5 minutes.</p>
      </div>
    `.trim(),
  };
}

export function buildWelcomeTemplate(
  name: string,
  role: string
): { subject: string; html: string } {
  const normalizedRole = role.trim().toLowerCase();
  const ctaLabel = normalizedRole === 'fixer' ? 'Browse jobs' : 'Post your first job';
  const ctaPath = normalizedRole === 'fixer' ? '/dashboard/browse-jobs' : '/dashboard/post-job';
  return {
    subject: 'Welcome to Fixly',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${name || 'there'}.</h2>
        <p>Your Fixly account is ready.</p>
        <p><a href="${getBaseUrl()}${ctaPath}">${ctaLabel}</a></p>
      </div>
    `.trim(),
  };
}

export function buildPasswordResetTemplate(resetToken: string): { subject: string; html: string } {
  const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
  return {
    subject: 'Reset your Fixly password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password reset</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `.trim(),
  };
}

export function buildJobApplicationTemplate(
  jobTitle: string,
  applicantName: string
): { subject: string; html: string } {
  return {
    subject: `New application for "${jobTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New job application</h2>
        <p>${applicantName} applied to your job "${jobTitle}".</p>
        <p><a href="${getBaseUrl()}/dashboard/jobs">Review applications</a></p>
      </div>
    `.trim(),
  };
}

export function buildPaymentConfirmationTemplate(
  planName: string,
  amount: string | number
): { subject: string; html: string } {
  const amountText = typeof amount === 'number' ? `Rs ${amount}` : amount;
  return {
    subject: 'Your Fixly subscription is active',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment confirmed</h2>
        <p>Your ${planName} subscription is active.</p>
        <p>Amount paid: ${amountText}</p>
        <p><a href="${getBaseUrl()}/dashboard/subscription">View subscription</a></p>
      </div>
    `.trim(),
  };
}
