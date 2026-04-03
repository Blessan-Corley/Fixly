import { describe, expect, it } from 'vitest';

import { ContactFormSchema } from '@/lib/validations/contact';

describe('ContactFormSchema', () => {
  const validInput = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'This is a test message that is long enough.',
  };

  it('accepts valid minimum input (no optional fields)', () => {
    const result = ContactFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts full valid input with all optional fields', () => {
    const result = ContactFormSchema.safeParse({
      ...validInput,
      subject: 'Need help with my account',
      phone: '+91 98765 43210',
      category: 'billing',
    });
    expect(result.success).toBe(true);
  });

  describe('name', () => {
    it('rejects name shorter than 2 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, name: 'A' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('name');
    });

    it('accepts name at exactly 2 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, name: 'Jo' });
      expect(result.success).toBe(true);
    });

    it('rejects name exceeding 80 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, name: 'a'.repeat(81) });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('name');
    });

    it('accepts name at exactly 80 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, name: 'a'.repeat(80) });
      expect(result.success).toBe(true);
    });

    it('rejects missing name', () => {
      const { name: _omit, ...rest } = validInput;
      const result = ContactFormSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('email', () => {
    it('rejects invalid email format', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, email: 'not-an-email' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('email');
    });

    it('rejects missing email', () => {
      const { email: _omit, ...rest } = validInput;
      const result = ContactFormSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('accepts email with subdomain', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        email: 'user@mail.example.co.uk',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('subject (optional)', () => {
    it('accepts omitted subject', () => {
      const result = ContactFormSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects subject exceeding 120 characters', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        subject: 'x'.repeat(121),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('subject');
    });

    it('accepts subject at exactly 120 characters', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        subject: 'x'.repeat(120),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('message', () => {
    it('rejects message shorter than 10 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, message: 'Too short' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('message');
    });

    it('accepts message at exactly 10 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, message: '1234567890' });
      expect(result.success).toBe(true);
    });

    it('rejects message exceeding 2000 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, message: 'a'.repeat(2001) });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('message');
    });

    it('accepts message at exactly 2000 characters', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, message: 'a'.repeat(2000) });
      expect(result.success).toBe(true);
    });

    it('rejects missing message', () => {
      const { message: _omit, ...rest } = validInput;
      const result = ContactFormSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('phone (optional)', () => {
    it('accepts omitted phone', () => {
      const result = ContactFormSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects phone exceeding 20 characters', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        phone: '1'.repeat(21),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('phone');
    });
  });

  describe('category (optional)', () => {
    it('accepts omitted category', () => {
      const result = ContactFormSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects category exceeding 50 characters', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        category: 'c'.repeat(51),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('category');
    });
  });

  it('rejects empty object', () => {
    const result = ContactFormSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThan(0);
  });
});
