import { describe, expect, it } from 'vitest';

import {
  FixerSettingsSchema,
  canAddVerificationDocuments,
  getVerificationReapplyDaysRemaining,
  sanitizeOtpDigits,
  validateVerificationUploadFiles,
} from '@/lib/validations/settings';

describe('FixerSettingsSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = FixerSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid full input', () => {
    const result = FixerSettingsSchema.safeParse({
      availableNow: true,
      serviceRadius: 25,
      hourlyRate: 500,
      minimumJobValue: 1000,
      maximumJobValue: 5000,
      responseTime: 'Within 2 hours',
      autoApply: false,
      emergencyAvailable: true,
      workingHours: { start: '09:00', end: '18:00' },
      workingDays: ['monday', 'tuesday', 'wednesday'],
      skills: ['Plumbing', 'Electrical'],
      portfolio: [{ url: 'https://example.com/project1', title: 'Kitchen renovation' }],
    });
    expect(result.success).toBe(true);
  });

  describe('availableNow (booleanish)', () => {
    it('accepts boolean true', () => {
      const result = FixerSettingsSchema.safeParse({ availableNow: true });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(true);
    });

    it('coerces string "true" to true', () => {
      const result = FixerSettingsSchema.safeParse({ availableNow: 'true' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(true);
    });

    it('coerces string "false" to false', () => {
      const result = FixerSettingsSchema.safeParse({ availableNow: 'false' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(false);
    });

    it('coerces number 1 to true', () => {
      const result = FixerSettingsSchema.safeParse({ availableNow: 1 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(true);
    });

    it('coerces number 0 to false', () => {
      const result = FixerSettingsSchema.safeParse({ availableNow: 0 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.availableNow).toBe(false);
    });

    it('rejects invalid string', () => {
      const result = FixerSettingsSchema.safeParse({ availableNow: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  describe('serviceRadius', () => {
    it('rejects 0', () => {
      const result = FixerSettingsSchema.safeParse({ serviceRadius: 0 });
      expect(result.success).toBe(false);
    });

    it('accepts 1', () => {
      const result = FixerSettingsSchema.safeParse({ serviceRadius: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts 100', () => {
      const result = FixerSettingsSchema.safeParse({ serviceRadius: 100 });
      expect(result.success).toBe(true);
    });

    it('rejects 101', () => {
      const result = FixerSettingsSchema.safeParse({ serviceRadius: 101 });
      expect(result.success).toBe(false);
    });

    it('coerces string number', () => {
      const result = FixerSettingsSchema.safeParse({ serviceRadius: '30' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.serviceRadius).toBe(30);
    });
  });

  describe('hourlyRate', () => {
    it('accepts 0', () => {
      const result = FixerSettingsSchema.safeParse({ hourlyRate: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts null', () => {
      const result = FixerSettingsSchema.safeParse({ hourlyRate: null });
      expect(result.success).toBe(true);
    });

    it('rejects hourlyRate above 10000', () => {
      const result = FixerSettingsSchema.safeParse({ hourlyRate: 10001 });
      expect(result.success).toBe(false);
    });

    it('accepts hourlyRate of 10000', () => {
      const result = FixerSettingsSchema.safeParse({ hourlyRate: 10000 });
      expect(result.success).toBe(true);
    });
  });

  describe('min/max job value refinement', () => {
    it('fails when minimumJobValue > maximumJobValue', () => {
      const result = FixerSettingsSchema.safeParse({
        minimumJobValue: 5000,
        maximumJobValue: 1000,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('minimumJobValue');
    });

    it('passes when minimumJobValue === maximumJobValue', () => {
      const result = FixerSettingsSchema.safeParse({
        minimumJobValue: 2000,
        maximumJobValue: 2000,
      });
      expect(result.success).toBe(true);
    });

    it('passes when minimumJobValue < maximumJobValue', () => {
      const result = FixerSettingsSchema.safeParse({
        minimumJobValue: 1000,
        maximumJobValue: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('passes when only minimumJobValue is set', () => {
      const result = FixerSettingsSchema.safeParse({ minimumJobValue: 1000 });
      expect(result.success).toBe(true);
    });

    it('passes when both are null', () => {
      const result = FixerSettingsSchema.safeParse({
        minimumJobValue: null,
        maximumJobValue: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('workingHours', () => {
    it('accepts valid HH:MM format', () => {
      const result = FixerSettingsSchema.safeParse({
        workingHours: { start: '08:30', end: '17:45' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid time format', () => {
      const result = FixerSettingsSchema.safeParse({
        workingHours: { start: '8:30', end: '25:00' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts midnight 00:00', () => {
      const result = FixerSettingsSchema.safeParse({
        workingHours: { start: '00:00', end: '23:59' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('workingDays', () => {
    it('rejects empty workingDays array', () => {
      const result = FixerSettingsSchema.safeParse({ workingDays: [] });
      expect(result.success).toBe(false);
    });

    it('accepts valid days', () => {
      const result = FixerSettingsSchema.safeParse({
        workingDays: ['monday', 'saturday', 'sunday'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid day name', () => {
      const result = FixerSettingsSchema.safeParse({ workingDays: ['funday'] });
      expect(result.success).toBe(false);
    });
  });

  describe('skills', () => {
    it('rejects more than 20 skills', () => {
      const skills = Array.from({ length: 21 }, (_, i) => `skill${i}`);
      const result = FixerSettingsSchema.safeParse({ skills });
      expect(result.success).toBe(false);
    });

    it('accepts exactly 20 skills', () => {
      const skills = Array.from({ length: 20 }, (_, i) => `skill${i}`);
      const result = FixerSettingsSchema.safeParse({ skills });
      expect(result.success).toBe(true);
    });
  });

  describe('portfolio', () => {
    it('rejects portfolio with more than 10 items', () => {
      const portfolio = Array.from({ length: 11 }, (_, i) => ({ id: i }));
      const result = FixerSettingsSchema.safeParse({ portfolio });
      expect(result.success).toBe(false);
    });

    it('accepts exactly 10 portfolio items', () => {
      const portfolio = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const result = FixerSettingsSchema.safeParse({ portfolio });
      expect(result.success).toBe(true);
    });
  });
});

describe('sanitizeOtpDigits', () => {
  it('removes non-digit characters', () => {
    expect(sanitizeOtpDigits('a1b2c3')).toBe('123');
  });

  it('truncates to default max of 6', () => {
    expect(sanitizeOtpDigits('123456789')).toBe('123456');
  });

  it('uses custom maxLength', () => {
    expect(sanitizeOtpDigits('123456789', 4)).toBe('1234');
  });

  it('handles empty string', () => {
    expect(sanitizeOtpDigits('')).toBe('');
  });
});

describe('getVerificationReapplyDaysRemaining', () => {
  it('returns 0 when no date provided', () => {
    expect(getVerificationReapplyDaysRemaining(null)).toBe(0);
    expect(getVerificationReapplyDaysRemaining(undefined)).toBe(0);
  });

  it('returns 0 when application date was more than 7 days ago', () => {
    const past = new Date();
    past.setDate(past.getDate() - 8);
    expect(getVerificationReapplyDaysRemaining(past.toISOString())).toBe(0);
  });

  it('returns positive days when application was recent (within 7 days)', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);
    const result = getVerificationReapplyDaysRemaining(recent.toISOString());
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(5);
  });

  it('accepts Date object', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 1);
    const result = getVerificationReapplyDaysRemaining(recent);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for invalid date string', () => {
    expect(getVerificationReapplyDaysRemaining('not-a-date')).toBe(0);
  });
});

describe('canAddVerificationDocuments', () => {
  it('returns true when current + incoming <= max', () => {
    expect(canAddVerificationDocuments(1, 2, 3)).toBe(true);
  });

  it('returns false when current + incoming > max', () => {
    expect(canAddVerificationDocuments(2, 2, 3)).toBe(false);
  });

  it('returns true when exactly at max', () => {
    expect(canAddVerificationDocuments(1, 2)).toBe(true); // default max is 3
  });

  it('returns false when adding even 1 would exceed default max of 3', () => {
    expect(canAddVerificationDocuments(3, 1)).toBe(false);
  });

  it('uses custom maxDocuments parameter', () => {
    expect(canAddVerificationDocuments(4, 1, 5)).toBe(true);
    expect(canAddVerificationDocuments(5, 1, 5)).toBe(false);
  });
});

describe('validateVerificationUploadFiles', () => {
  function makeFile(name: string, type: string, size: number): File {
    const blob = new Blob(['x'.repeat(size)], { type });
    return new File([blob], name, { type });
  }

  it('accepts valid JPEG file under 5MB', () => {
    const file = makeFile('id.jpg', 'image/jpeg', 1024);
    const { validFiles, errors } = validateVerificationUploadFiles([file]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid PNG file', () => {
    const file = makeFile('id.png', 'image/png', 1024);
    const { validFiles, errors } = validateVerificationUploadFiles([file]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid PDF file', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1024);
    const { validFiles, errors } = validateVerificationUploadFiles([file]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported file type', () => {
    const file = makeFile('video.mp4', 'video/mp4', 1024);
    const { validFiles, errors } = validateVerificationUploadFiles([file]);
    expect(validFiles).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unsupported file type');
  });

  it('rejects file exceeding 5MB', () => {
    const file = makeFile('huge.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
    const { validFiles, errors } = validateVerificationUploadFiles([file]);
    expect(validFiles).toHaveLength(0);
    expect(errors[0]).toContain('5MB');
  });

  it('handles mixed valid and invalid files', () => {
    const validFile = makeFile('id.pdf', 'application/pdf', 1024);
    const invalidFile = makeFile('vid.mp4', 'video/mp4', 1024);
    const { validFiles, errors } = validateVerificationUploadFiles([validFile, invalidFile]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it('returns empty arrays for empty input', () => {
    const { validFiles, errors } = validateVerificationUploadFiles([]);
    expect(validFiles).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});
