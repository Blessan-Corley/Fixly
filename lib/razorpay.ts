import Razorpay from 'razorpay';

import { env } from '@/lib/env';

const keyId = env.RAZORPAY_KEY_ID;
const keySecret = env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
}

export const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
