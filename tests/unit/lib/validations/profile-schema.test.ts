import { describe, expect, it } from 'vitest';

import {
  UpdateProfileSchema,
  sanitizeIndianPhoneDigits,
  sanitizeOtpDigits,
  validatePasswordRequirements,
  validateProfilePhotoFile,
} from '@/lib/validations/profile';

describe('UpdateProfileSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = UpdateProfileSchema.safeParse({
      name: 'John Doe',
      bio: 'Professional plumber.',
      location: { city: 'Bangalore', state: 'Karnataka' },
      skills: ['Plumbing', 'Welding'],
      availableNow: true,
      serviceRadius: 15,
    });
    expect(result.success).toBe(true);
  });

  describe('name', () => {
    it('rejects name shorter than 2 characters', () => {
      const result = UpdateProfileSchema.safeParse({ name: 'A' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('name');
    });

    it('accepts name at exactly 2 characters', () => {
      const result = UpdateProfileSchema.safeParse({ name: 'Jo' });
      expect(result.success).toBe(true);
    });

    it('rejects name exceeding 80 characters', () => {
      const result = UpdateProfileSchema.safeParse({ name: 'a'.repeat(81) });
      expect(result.success).toBe(false);
    });

    it('accepts name at exactly 80 characters', () => {
      const result = UpdateProfileSchema.safeParse({ name: 'a'.repeat(80) });
      expect(result.success).toBe(true);
    });
  });

  describe('bio', () => {
    it('rejects bio exceeding 500 characters', () => {
      const result = UpdateProfileSchema.safeParse({ bio: 'b'.repeat(501) });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('bio');
    });

    it('accepts bio at exactly 500 characters', () => {
      const result = UpdateProfileSchema.safeParse({ bio: 'b'.repeat(500) });
      expect(result.success).toBe(true);
    });
  });

  describe('skills', () => {
    it('rejects skills array with more than 50 items', () => {
      const skills = Array.from({ length: 51 }, (_, i) => `skill${i}`);
      const result = UpdateProfileSchema.safeParse({ skills });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('skills');
    });

    it('accepts skills array with exactly 50 items', () => {
      const skills = Array.from({ length: 50 }, (_, i) => `skill${i}`);
      const result = UpdateProfileSchema.safeParse({ skills });
      expect(result.success).toBe(true);
    });

    it('rejects skill string exceeding 50 characters', () => {
      const result = UpdateProfileSchema.safeParse({ skills: ['s'.repeat(51)] });
      expect(result.success).toBe(false);
    });

    it('rejects empty string skill', () => {
      const result = UpdateProfileSchema.safeParse({ skills: [''] });
      expect(result.success).toBe(false);
    });
  });

  describe('availableNow', () => {
    it('accepts boolean true', () => {
      const result = UpdateProfileSchema.safeParse({ availableNow: true });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(true);
    });

    it('accepts boolean false', () => {
      const result = UpdateProfileSchema.safeParse({ availableNow: false });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(false);
    });

    it('coerces string "true" to boolean true', () => {
      const result = UpdateProfileSchema.safeParse({ availableNow: 'true' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(true);
    });

    it('coerces string "false" to boolean false', () => {
      const result = UpdateProfileSchema.safeParse({ availableNow: 'false' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(false);
    });

    it('coerces string "1" to boolean true', () => {
      const result = UpdateProfileSchema.safeParse({ availableNow: '1' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(true);
    });

    it('coerces string "0" to boolean false', () => {
      const result = UpdateProfileSchema.safeParse({ availableNow: '0' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(false);
    });

    it('rejects invalid string value', () => {
      const result = UpdateProfileSchema.safeParse({ availableNow: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  describe('serviceRadius', () => {
    it('rejects serviceRadius less than 1', () => {
      const result = UpdateProfileSchema.safeParse({ serviceRadius: 0 });
      expect(result.success).toBe(false);
    });

    it('accepts serviceRadius at 1', () => {
      const result = UpdateProfileSchema.safeParse({ serviceRadius: 1 });
      expect(result.success).toBe(true);
    });

    it('rejects serviceRadius greater than 50', () => {
      const result = UpdateProfileSchema.safeParse({ serviceRadius: 51 });
      expect(result.success).toBe(false);
    });

    it('accepts serviceRadius at 50', () => {
      const result = UpdateProfileSchema.safeParse({ serviceRadius: 50 });
      expect(result.success).toBe(true);
    });

    it('coerces string number to number via z.coerce', () => {
      const result = UpdateProfileSchema.safeParse({ serviceRadius: '25' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.serviceRadius).toBe(25);
    });
  });

  describe('location', () => {
    it('accepts location with various optional sub-fields', () => {
      const result = UpdateProfileSchema.safeParse({
        location: {
          lat: 12.9352,
          lng: 77.6245,
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560034',
          formatted_address: '123 Main St, Bangalore',
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty location object', () => {
      const result = UpdateProfileSchema.safeParse({ location: {} });
      expect(result.success).toBe(true);
    });
  });
});

describe('validatePasswordRequirements', () => {
  it('returns isValid true for a strong password', () => {
    const result = validatePasswordRequirements('StrongPass1!');
    expect(result.isValid).toBe(true);
    expect(result.requirements.minLength).toBe(true);
    expect(result.requirements.hasLetter).toBe(true);
    expect(result.requirements.hasNumber).toBe(true);
    expect(result.requirements.hasSpecial).toBe(true);
  });

  it('fails minLength for short password', () => {
    const result = validatePasswordRequirements('Sh1!');
    expect(result.requirements.minLength).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('fails hasNumber for password without digits', () => {
    const result = validatePasswordRequirements('NoDigitsHere!');
    expect(result.requirements.hasNumber).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('fails hasSpecial for password without special characters', () => {
    const result = validatePasswordRequirements('NoSpecial1A');
    expect(result.requirements.hasSpecial).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('fails hasLetter for password without letters', () => {
    const result = validatePasswordRequirements('12345678!');
    expect(result.requirements.hasLetter).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('returns all false for empty password', () => {
    const result = validatePasswordRequirements('');
    expect(result.isValid).toBe(false);
    expect(result.requirements.minLength).toBe(false);
  });
});

describe('sanitizeOtpDigits', () => {
  it('removes non-digit characters', () => {
    expect(sanitizeOtpDigits('1a2b3c')).toBe('123');
  });

  it('truncates to maxLength (default 6)', () => {
    expect(sanitizeOtpDigits('1234567890')).toBe('123456');
  });

  it('returns empty string for all-letter input', () => {
    expect(sanitizeOtpDigits('abcdef')).toBe('');
  });

  it('uses custom maxLength', () => {
    expect(sanitizeOtpDigits('123456789', 4)).toBe('1234');
  });

  it('handles empty string', () => {
    expect(sanitizeOtpDigits('')).toBe('');
  });
});

describe('sanitizeIndianPhoneDigits', () => {
  it('removes non-digit characters', () => {
    expect(sanitizeIndianPhoneDigits('+91 98765 43210')).toBe('9198765432');
  });

  it('truncates to 10 digits', () => {
    expect(sanitizeIndianPhoneDigits('12345678901234')).toBe('1234567890');
  });

  it('handles empty string', () => {
    expect(sanitizeIndianPhoneDigits('')).toBe('');
  });

  it('handles already valid 10-digit number', () => {
    expect(sanitizeIndianPhoneDigits('9876543210')).toBe('9876543210');
  });
});

describe('validateProfilePhotoFile', () => {
  function makeFile(name: string, type: string, size: number): File {
    const blob = new Blob(['x'.repeat(size)], { type });
    return new File([blob], name, { type });
  }

  it('returns null for valid JPEG under 5MB', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024 * 100);
    expect(validateProfilePhotoFile(file)).toBeNull();
  });

  it('returns null for valid PNG under 5MB', () => {
    const file = makeFile('photo.png', 'image/png', 1024 * 100);
    expect(validateProfilePhotoFile(file)).toBeNull();
  });

  it('returns null for valid WebP under 5MB', () => {
    const file = makeFile('photo.webp', 'image/webp', 1024);
    expect(validateProfilePhotoFile(file)).toBeNull();
  });

  it('returns error for unsupported file type', () => {
    const file = makeFile('document.pdf', 'application/pdf', 1024);
    const error = validateProfilePhotoFile(file);
    expect(error).toMatch(/JPEG|PNG|WebP/i);
  });

  it('returns error for file exceeding 5MB', () => {
    const file = makeFile('huge.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
    const error = validateProfilePhotoFile(file);
    expect(error).toMatch(/5MB/);
  });

  it('returns null for file exactly at 5MB limit', () => {
    const file = makeFile('exact.jpg', 'image/jpeg', 5 * 1024 * 1024);
    expect(validateProfilePhotoFile(file)).toBeNull();
  });
});
