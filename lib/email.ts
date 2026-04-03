import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  sendEmail as sendRawEmail,
  sendJobApplicationEmail,
  sendPaymentConfirmationEmail,
  sendWelcomeEmail,
} from '@/lib/services/emailService';

type SendEmailOptions = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
};

function getStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function renderGenericTemplate(subject: string, data: Record<string, unknown>): string {
  const rows = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `<p><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${subject}</h2>
      ${rows}
    </div>
  `.trim();
}

export async function sendEmail({
  to,
  subject,
  template,
  data,
}: SendEmailOptions): Promise<void> {
  if (env.NODE_ENV === 'test') {
    logger.info({ subject, to, template }, '[Email] Skipped send in test mode');
    return;
  }

  switch (template) {
    case 'welcome-hirer':
      await sendWelcomeEmail(to, getStringValue(data.name, 'there'), 'hirer');
      return;
    case 'welcome-fixer':
      await sendWelcomeEmail(to, getStringValue(data.name, 'there'), 'fixer');
      return;
    case 'application-received':
      await sendJobApplicationEmail(
        to,
        getStringValue(data.jobTitle, 'your job'),
        getStringValue(data.fixerName, 'A fixer')
      );
      return;
    case 'payment-confirmed':
      await sendPaymentConfirmationEmail(
        to,
        getStringValue(data.jobTitle || data.planName, 'Fixly plan'),
        getStringValue(data.amount, 'Paid')
      );
      return;
    default:
      await sendRawEmail(to, subject, renderGenericTemplate(subject, data));
  }
}

const emailService = {
  sendEmail,
};

export default emailService;
