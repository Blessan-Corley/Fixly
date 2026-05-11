import { describe, expect, it } from 'vitest';

import { CreateOrderSchema, VerifyPaymentSchema } from '@/lib/validations/subscription';

describe('CreateOrderSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = CreateOrderSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = CreateOrderSchema.safeParse({
      planId: 'plan_pro_monthly',
      role: 'hirer',
      plan: 'monthly',
    });
    expect(result.success).toBe(true);
  });

  describe('role', () => {
    it('accepts role "hirer"', () => {
      const result = CreateOrderSchema.safeParse({ role: 'hirer' });
      expect(result.success).toBe(true);
    });

    it('accepts role "fixer"', () => {
      const result = CreateOrderSchema.safeParse({ role: 'fixer' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = CreateOrderSchema.safeParse({ role: 'admin' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('role');
    });

    it('accepts omitted role', () => {
      const result = CreateOrderSchema.safeParse({ plan: 'monthly' });
      expect(result.success).toBe(true);
    });
  });

  describe('plan', () => {
    it('accepts plan "monthly"', () => {
      const result = CreateOrderSchema.safeParse({ plan: 'monthly' });
      expect(result.success).toBe(true);
    });

    it('accepts plan "yearly"', () => {
      const result = CreateOrderSchema.safeParse({ plan: 'yearly' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid plan value', () => {
      const result = CreateOrderSchema.safeParse({ plan: 'weekly' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('plan');
    });

    it('accepts omitted plan', () => {
      const result = CreateOrderSchema.safeParse({ role: 'hirer' });
      expect(result.success).toBe(true);
    });
  });

  describe('planId', () => {
    it('accepts a string planId', () => {
      const result = CreateOrderSchema.safeParse({ planId: 'price_12345' });
      expect(result.success).toBe(true);
    });

    it('accepts omitted planId', () => {
      const result = CreateOrderSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('VerifyPaymentSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = VerifyPaymentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid Razorpay payload with all fields', () => {
    const result = VerifyPaymentSchema.safeParse({
      razorpay_order_id: 'order_abc123',
      razorpay_payment_id: 'pay_xyz789',
      razorpay_signature: 'sig_hash_value',
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial input with only razorpay_order_id', () => {
    const result = VerifyPaymentSchema.safeParse({ razorpay_order_id: 'order_abc' });
    expect(result.success).toBe(true);
  });

  it('rejects non-string razorpay_order_id', () => {
    const result = VerifyPaymentSchema.safeParse({ razorpay_order_id: 12345 });
    expect(result.success).toBe(false);
  });

  it('rejects non-string razorpay_payment_id', () => {
    const result = VerifyPaymentSchema.safeParse({ razorpay_payment_id: true });
    expect(result.success).toBe(false);
  });
});
