export const ADMIN_EMAIL = 'blessancorley@gmail.com';
export const SUPPORT_PHONE = '+91 9976768211';
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;

export function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toSafeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function toSafeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export function buildAdminEmailContent(params: {
  name: string;
  email: string;
  phone: string | null;
  category: string | null;
  subject: string | null;
  message: string;
}): string {
  return `
New Contact Form Submission from Fixly Website

Name: ${params.name}
Email: ${params.email}
Phone: ${params.phone || 'Not provided'}
Category: ${params.category || 'General'}
Subject: ${params.subject || 'No subject'}

Message:
${params.message}

---
This message was sent through the Fixly contact form.
Reply directly to this email to respond to ${params.name}.
  `.trim();
}

export function buildConfirmationEmailContent(params: {
  name: string;
  subject: string | null;
  category: string | null;
}): string {
  return `
Hi ${params.name},

Thank you for reaching out to Fixly! We've received your message and will get back to you as soon as possible.

Your message details:
Subject: ${params.subject || 'No subject'}
Category: ${params.category || 'General'}

We typically respond within 24 hours during business days. If you have an urgent matter, please call us at ${SUPPORT_PHONE}.

Best regards,
The Fixly Team

---
This is an automated confirmation email. Please do not reply to this email.
For immediate assistance, contact us at ${ADMIN_EMAIL} or ${SUPPORT_PHONE}.
  `.trim();
}
