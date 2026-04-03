import axios, { isAxiosError } from 'axios';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';
const PHONE_NUMBER_ID = env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = env.WHATSAPP_ACCESS_TOKEN;

type WhatsAppNotificationPayload = {
  phoneNumber: string;
  message: string;
};

function getAxiosErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const apiMessage =
      typeof error.response?.data === 'string'
        ? error.response.data
        : JSON.stringify(error.response?.data ?? {});
    return apiMessage || error.message;
  }

  return error instanceof Error ? error.message : 'Unknown WhatsApp error';
}

function hasCredentials(): boolean {
  return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

export async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<boolean> {
  if (!hasCredentials()) {
    logger.warn('WhatsApp API credentials missing.');
    return false;
  }

  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'auth_otp',
          language: {
            code: 'en_US',
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: otp,
                },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                {
                  type: 'text',
                  text: otp,
                },
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return true;
  } catch (error: unknown) {
    logger.error({ error: getAxiosErrorMessage(error) }, 'WhatsApp OTP API error');
    return false;
  }
}

export async function sendWhatsAppNotification(
  payload: WhatsAppNotificationPayload
): Promise<boolean> {
  const phoneNumber = payload?.phoneNumber?.trim();
  const message = payload?.message?.trim();

  if (!phoneNumber || !message) {
    return false;
  }

  if (!hasCredentials()) {
    logger.warn('WhatsApp API credentials missing.');
    return false;
  }

  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: message.slice(0, 4096),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return true;
  } catch (error: unknown) {
    logger.error({ error: getAxiosErrorMessage(error) }, 'WhatsApp notification error');
    return false;
  }
}

export async function sendWhatsAppWelcome(phoneNumber: string, userName: string): Promise<void> {
  if (!hasCredentials()) {
    return;
  }

  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'welcome_message',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: userName }],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
  } catch (error: unknown) {
    logger.error(
      { error: getAxiosErrorMessage(error) },
      'Failed to send WhatsApp welcome message'
    );
  }
}
