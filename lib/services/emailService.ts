import {
  buildJobApplicationTemplate,
  buildOtpTemplate,
  buildPasswordResetTemplate,
  buildPaymentConfirmationTemplate,
  buildWelcomeTemplate,
} from './email/templates';
import {
  getDefaultSenderEmail,
  getDefaultSenderName,
  normalizeText,
  sendMailWithRetry,
} from './email/transport';

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const resolvedHtml = html?.trim();
  const resolvedText = text?.trim();

  if (!resolvedHtml && !resolvedText) {
    throw new Error('Email requires html or text content');
  }

  await sendMailWithRetry(
    {
      from: `"${getDefaultSenderName()}" <${getDefaultSenderEmail()}>`,
      to,
      subject,
      html: resolvedHtml || undefined,
      text: resolvedText || (resolvedHtml ? normalizeText(resolvedHtml) : undefined),
    },
    { to, subject }
  );
}

export async function sendOtpEmail(to: string, otp: string, type: string): Promise<void> {
  const template = buildOtpTemplate(type, otp);
  await sendEmail(to, template.subject, template.html);
}

export async function sendWelcomeEmail(to: string, name: string, role: string): Promise<void> {
  const template = buildWelcomeTemplate(name, role);
  await sendEmail(to, template.subject, template.html);
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const template = buildPasswordResetTemplate(resetToken);
  await sendEmail(to, template.subject, template.html);
}

export async function sendJobApplicationEmail(
  to: string,
  jobTitle: string,
  applicantName: string
): Promise<void> {
  const template = buildJobApplicationTemplate(jobTitle, applicantName);
  await sendEmail(to, template.subject, template.html);
}

export async function sendPaymentConfirmationEmail(
  to: string,
  planName: string,
  amount: string | number
): Promise<void> {
  const template = buildPaymentConfirmationTemplate(planName, amount);
  await sendEmail(to, template.subject, template.html);
}

export async function sendContactFormEmail(
  to: string,
  from: string,
  subject: string,
  message: string
): Promise<void> {
  await sendMailWithRetry(
    {
      from: `"${getDefaultSenderName()}" <${getDefaultSenderEmail()}>`,
      to,
      subject,
      text: message,
      replyTo: from || undefined,
    },
    { to, subject }
  );
}

const emailService = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendJobApplicationEmail,
  sendPaymentConfirmationEmail,
  sendContactFormEmail,
};

export default emailService;
