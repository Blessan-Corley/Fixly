import Stripe from 'stripe';

import { env } from '@/lib/env';

const stripeSecretKey = env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(stripeSecretKey);
