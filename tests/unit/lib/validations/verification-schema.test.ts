import { describe, expect, it } from 'vitest';

import { VerificationApplySchema } from '@/lib/validations/verification';

describe('VerificationApplySchema', () => {
  const validInput = {
    type: 'id' as const,
    documents: ['https://example.com/doc1.jpg'],
  };

  it('accepts valid minimum input', () => {
    const result = VerificationApplySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = VerificationApplySchema.safeParse({
      type: 'professional',
      documents: [
        'https://example.com/cert1.pdf',
        'https://example.com/cert2.pdf',
      ],
      notes: 'These are my professional certifications.',
    });
    expect(result.success).toBe(true);
  });

  describe('type', () => {
    it('accepts type "id"', () => {
      const result = VerificationApplySchema.safeParse({ ...validInput, type: 'id' });
      expect(result.success).toBe(true);
    });

    it('accepts type "address"', () => {
      const result = VerificationApplySchema.safeParse({ ...validInput, type: 'address' });
      expect(result.success).toBe(true);
    });

    it('accepts type "professional"', () => {
      const result = VerificationApplySchema.safeParse({ ...validInput, type: 'professional' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = VerificationApplySchema.safeParse({ ...validInput, type: 'license' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('type');
    });

    it('rejects missing type', () => {
      const { type: _omit, ...rest } = validInput;
      const result = VerificationApplySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('documents', () => {
    it('rejects empty documents array', () => {
      const result = VerificationApplySchema.safeParse({ ...validInput, documents: [] });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('documents');
    });

    it('accepts array with exactly 1 document', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        documents: ['https://example.com/doc.pdf'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts array with exactly 5 documents', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        documents: [
          'https://example.com/doc1.pdf',
          'https://example.com/doc2.pdf',
          'https://example.com/doc3.pdf',
          'https://example.com/doc4.pdf',
          'https://example.com/doc5.pdf',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects array with more than 5 documents', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        documents: [
          'https://example.com/doc1.pdf',
          'https://example.com/doc2.pdf',
          'https://example.com/doc3.pdf',
          'https://example.com/doc4.pdf',
          'https://example.com/doc5.pdf',
          'https://example.com/doc6.pdf',
        ],
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('documents');
    });

    it('rejects document with invalid URL', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        documents: ['not-a-url'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty string as document URL', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        documents: [''],
      });
      expect(result.success).toBe(false);
    });

    it('accepts HTTPS document URLs', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        documents: ['https://cloudinary.com/image/upload/abc.jpg'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing documents', () => {
      const { documents: _omit, ...rest } = validInput;
      const result = VerificationApplySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('notes (optional)', () => {
    it('accepts omitted notes', () => {
      const result = VerificationApplySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('accepts notes within 500 characters', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        notes: 'n'.repeat(500),
      });
      expect(result.success).toBe(true);
    });

    it('rejects notes exceeding 500 characters', () => {
      const result = VerificationApplySchema.safeParse({
        ...validInput,
        notes: 'n'.repeat(501),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('notes');
    });

    it('accepts empty string notes', () => {
      const result = VerificationApplySchema.safeParse({ ...validInput, notes: '' });
      expect(result.success).toBe(true);
    });
  });

  it('rejects completely empty object', () => {
    const result = VerificationApplySchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(2);
  });
});
