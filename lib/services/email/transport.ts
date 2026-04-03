import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

let transporter: Transporter | null = null;

function parsePort(value: string | undefined, fallback = 587): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isSecureTransport(port: number): boolean {
  if (env.EMAIL_SECURE === 'true') return true;
  if (env.EMAIL_SECURE === 'false') return false;
  return port === 465;
}

function createTransporter(): Transporter {
  const port = parsePort(env.EMAIL_PORT);
  return nodemailer.createTransport({
    host: env.EMAIL_HOST ?? 'smtp.gmail.com',
    port,
    secure: isSecureTransport(port),
    auth: {
      user: env.EMAIL_USER ?? env.SMTP_EMAIL,
      pass: env.EMAIL_PASSWORD ?? env.SMTP_PASSWORD,
    },
  });
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function normalizeText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDefaultSenderEmail(): string {
  return env.EMAIL_USER ?? env.SMTP_EMAIL ?? 'no-reply@fixly.app';
}

export function getDefaultSenderName(): string {
  return 'Fixly';
}

export async function sendMailWithRetry(
  options: SendMailOptions,
  context: { to: string; subject: string }
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const info = await getTransporter().sendMail(options);
      logger.info(
        { to: context.to, subject: context.subject, messageId: info.messageId },
        'Email sent'
      );
      return;
    } catch (error: unknown) {
      lastError = error;

      if (attempt < MAX_RETRIES) {
        logger.warn(
          {
            to: context.to,
            subject: context.subject,
            attempt: attempt + 1,
            error: getErrorMessage(error),
          },
          'Email send failed, retrying'
        );
        await delay(RETRY_DELAY_MS);
        continue;
      }
    }
  }

  logger.error(
    { to: context.to, subject: context.subject, error: getErrorMessage(lastError) },
    'Email send failed after retries'
  );
  throw new Error(getErrorMessage(lastError));
}
