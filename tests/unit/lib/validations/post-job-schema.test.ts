import { describe, expect, it } from 'vitest';

import {
  buildPostJobContentViolationMessage,
  validatePostJobStep,
} from '@/lib/validations/post-job';
import type { PostJobFormData } from '@/types/jobs/post-job';

function futureDate(hoursFromNow = 48): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
}

function makeFormData(overrides: Partial<PostJobFormData> = {}): PostJobFormData {
  return {
    title: 'Fix my bathroom tiles',
    description: 'I need someone to replace 20 broken bathroom tiles in my home.',
    skillsRequired: ['tiling'],
    budget: { type: 'fixed', amount: '5000', materialsIncluded: false },
    location: {
      address: '123 Main Street, Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      lat: 12.9352,
      lng: 77.6245,
    },
    deadline: futureDate(48),
    urgency: 'flexible',
    type: 'one-time',
    scheduledDate: '',
    attachments: [
      {
        id: 'att1',
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: 102400,
        url: 'https://example.com/photo.jpg',
        isImage: true,
        isVideo: false,
      },
    ],
    ...overrides,
  };
}

describe('validatePostJobStep', () => {
  describe('Step 1 — title, description, skills', () => {
    it('passes with valid data', async () => {
      const errors = await validatePostJobStep({ step: 1, formData: makeFormData(), isPro: false });
      expect(errors).toEqual({});
    });

    it('fails when title is missing', async () => {
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData({ title: '' }),
        isPro: false,
      });
      expect(errors.title).toBeTruthy();
    });

    it('fails when title is only whitespace', async () => {
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData({ title: '   ' }),
        isPro: false,
      });
      expect(errors.title).toBeTruthy();
    });

    it('fails when title is shorter than 10 characters', async () => {
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData({ title: 'Fix tile' }),
        isPro: false,
      });
      expect(errors.title).toMatch(/10 characters/i);
    });

    it('passes when title is exactly 10 characters', async () => {
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData({ title: '1234567890' }),
        isPro: false,
      });
      expect(errors.title).toBeUndefined();
    });

    it('fails when description is missing', async () => {
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData({ description: '' }),
        isPro: false,
      });
      expect(errors.description).toBeTruthy();
    });

    it('fails when description is shorter than 30 characters', async () => {
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData({ description: 'Too short.' }),
        isPro: false,
      });
      expect(errors.description).toMatch(/30 characters/i);
    });

    it('fails when skillsRequired is empty', async () => {
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData({ skillsRequired: [] }),
        isPro: false,
      });
      expect(errors.skillsRequired).toBeTruthy();
    });

    it('invokes validateContent and captures violation for title', async () => {
      const validateContent = async () => 'Title contains contact info';
      const errors = await validatePostJobStep({
        step: 1,
        formData: makeFormData(),
        isPro: false,
        validateContent,
      });
      expect(errors.title).toBe('Title contains contact info');
    });

    it('does not call validateContent when title is too short', async () => {
      let calledForTitle = false;
      const validateContent = async (_value: string, fieldName: string) => {
        if (fieldName === 'Title') calledForTitle = true;
        return null;
      };
      await validatePostJobStep({
        step: 1,
        formData: makeFormData({ title: 'Short' }),
        isPro: false,
        validateContent,
      });
      expect(calledForTitle).toBe(false);
    });
  });

  describe('Step 2 — budget and location', () => {
    it('passes with valid data', async () => {
      const errors = await validatePostJobStep({ step: 2, formData: makeFormData(), isPro: false });
      expect(errors).toEqual({});
    });

    it('fails when budget type is not negotiable and amount is missing', async () => {
      const errors = await validatePostJobStep({
        step: 2,
        formData: makeFormData({
          budget: { type: 'fixed', amount: '', materialsIncluded: false },
        }),
        isPro: false,
      });
      expect(errors['budget.amount']).toBeTruthy();
    });

    it('passes when budget type is negotiable without amount', async () => {
      const errors = await validatePostJobStep({
        step: 2,
        formData: makeFormData({
          budget: { type: 'negotiable', amount: '', materialsIncluded: false },
        }),
        isPro: false,
      });
      expect(errors['budget.amount']).toBeUndefined();
    });

    it('fails when location address is missing', async () => {
      const errors = await validatePostJobStep({
        step: 2,
        formData: makeFormData({
          location: {
            address: '',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '',
            lat: null,
            lng: null,
          },
        }),
        isPro: false,
      });
      expect(errors['location.address']).toBeTruthy();
    });

    it('fails when location city is missing', async () => {
      const errors = await validatePostJobStep({
        step: 2,
        formData: makeFormData({
          location: {
            address: '123 Main St',
            city: '',
            state: 'Karnataka',
            pincode: '',
            lat: null,
            lng: null,
          },
        }),
        isPro: false,
      });
      expect(errors['location.city']).toBeTruthy();
    });

    it('fails when pincode has invalid format (non-6-digit)', async () => {
      const errors = await validatePostJobStep({
        step: 2,
        formData: makeFormData({
          location: {
            address: '123 Main St',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '1234',
            lat: null,
            lng: null,
          },
        }),
        isPro: false,
      });
      expect(errors['location.pincode']).toMatch(/pincode/i);
    });

    it('passes when pincode is exactly 6 digits', async () => {
      const errors = await validatePostJobStep({
        step: 2,
        formData: makeFormData(),
        isPro: false,
      });
      expect(errors['location.pincode']).toBeUndefined();
    });

    it('passes when pincode is empty (optional)', async () => {
      const errors = await validatePostJobStep({
        step: 2,
        formData: makeFormData({
          location: {
            address: '123 Main St',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '',
            lat: null,
            lng: null,
          },
        }),
        isPro: false,
      });
      expect(errors['location.pincode']).toBeUndefined();
    });
  });

  describe('Step 3 — deadline / schedule and attachments', () => {
    it('passes with valid deadline and at least 1 photo', async () => {
      const errors = await validatePostJobStep({ step: 3, formData: makeFormData(), isPro: false });
      expect(errors).toEqual({});
    });

    it('fails when no attachments (no photos)', async () => {
      const errors = await validatePostJobStep({
        step: 3,
        formData: makeFormData({ attachments: [] }),
        isPro: false,
      });
      expect(errors.attachments).toBeTruthy();
    });

    it('fails when deadline is in the past', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const errors = await validatePostJobStep({
        step: 3,
        formData: makeFormData({ deadline: past.toISOString() }),
        isPro: false,
      });
      expect(errors.deadline).toBeTruthy();
    });

    it('fails for free user when deadline is less than 24h from now', async () => {
      const errors = await validatePostJobStep({
        step: 3,
        formData: makeFormData({ deadline: futureDate(12) }),
        isPro: false,
      });
      expect(errors.deadline).toMatch(/24 hours/i);
    });

    it('passes for Pro user with deadline less than 24h from now', async () => {
      const errors = await validatePostJobStep({
        step: 3,
        formData: makeFormData({ deadline: futureDate(12) }),
        isPro: true,
      });
      expect(errors.deadline).toBeUndefined();
    });

    it('fails when urgency is scheduled and scheduledDate is missing', async () => {
      const errors = await validatePostJobStep({
        step: 3,
        formData: makeFormData({ urgency: 'scheduled', scheduledDate: '' }),
        isPro: false,
      });
      expect(errors.scheduledDate).toBeTruthy();
    });

    it('fails when scheduledDate is in the past', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const errors = await validatePostJobStep({
        step: 3,
        formData: makeFormData({
          urgency: 'scheduled',
          scheduledDate: past.toISOString(),
        }),
        isPro: false,
      });
      expect(errors.scheduledDate).toBeTruthy();
    });

    it('passes when urgency is scheduled and scheduledDate is in the future', async () => {
      const errors = await validatePostJobStep({
        step: 3,
        formData: makeFormData({
          urgency: 'scheduled',
          scheduledDate: futureDate(72),
          deadline: futureDate(48),
        }),
        isPro: false,
      });
      // scheduledDate is valid, should have no scheduledDate error
      expect(errors.scheduledDate).toBeUndefined();
    });
  });

  describe('Step 4 — final review validation', () => {
    it('passes with fully valid data', async () => {
      const errors = await validatePostJobStep({ step: 4, formData: makeFormData(), isPro: false });
      expect(errors).toEqual({});
    });

    it('fails when title exceeds 30 characters', async () => {
      const errors = await validatePostJobStep({
        step: 4,
        formData: makeFormData({ title: 'Fix my bathroom tiles and more!!!' }),
        isPro: false,
      });
      expect(errors.title).toMatch(/30 characters/i);
    });

    it('fails when no photos', async () => {
      const errors = await validatePostJobStep({
        step: 4,
        formData: makeFormData({ attachments: [] }),
        isPro: false,
      });
      expect(errors.attachments).toBeTruthy();
    });

    it('fails when more than 5 photos', async () => {
      const photos = Array.from({ length: 6 }, (_, i) => ({
        id: `p${i}`,
        name: `photo${i}.jpg`,
        type: 'image/jpeg',
        size: 1024,
        url: `https://example.com/photo${i}.jpg`,
        isImage: true,
        isVideo: false,
      }));
      const errors = await validatePostJobStep({
        step: 4,
        formData: makeFormData({ attachments: photos }),
        isPro: false,
      });
      expect(errors.attachments).toMatch(/5 photos/i);
    });

    it('fails when more than 1 video', async () => {
      const attachments = [
        {
          id: 'p1',
          name: 'photo.jpg',
          type: 'image/jpeg',
          size: 1024,
          url: 'https://example.com/photo.jpg',
          isImage: true,
          isVideo: false,
        },
        {
          id: 'v1',
          name: 'video1.mp4',
          type: 'video/mp4',
          size: 1024,
          url: 'https://example.com/video1.mp4',
          isImage: false,
          isVideo: true,
        },
        {
          id: 'v2',
          name: 'video2.mp4',
          type: 'video/mp4',
          size: 1024,
          url: 'https://example.com/video2.mp4',
          isImage: false,
          isVideo: true,
        },
      ];
      const errors = await validatePostJobStep({
        step: 4,
        formData: makeFormData({ attachments }),
        isPro: false,
      });
      expect(errors.attachments).toMatch(/1 video/i);
    });

    it('fails when budget type is not set', async () => {
      const errors = await validatePostJobStep({
        step: 4,
        formData: makeFormData({
          budget: { type: '' as never, amount: '', materialsIncluded: false },
        }),
        isPro: false,
      });
      expect(errors['budget.type']).toBeTruthy();
    });

    it('fails when urgency is not set', async () => {
      const errors = await validatePostJobStep({
        step: 4,
        formData: makeFormData({ urgency: '' as never }),
        isPro: false,
      });
      expect(errors.urgency).toBeTruthy();
    });

    it('fails when budget amount is 0 for fixed type', async () => {
      const errors = await validatePostJobStep({
        step: 4,
        formData: makeFormData({
          budget: { type: 'fixed', amount: '0', materialsIncluded: false },
        }),
        isPro: false,
      });
      expect(errors['budget.amount']).toBeTruthy();
    });
  });

  describe('Unknown step', () => {
    it('returns empty errors for unknown step number', async () => {
      const errors = await validatePostJobStep({ step: 99, formData: makeFormData(), isPro: false });
      expect(errors).toEqual({});
    });
  });
});

describe('buildPostJobContentViolationMessage', () => {
  it('includes field name in the message', () => {
    const msg = buildPostJobContentViolationMessage('Title', ['profanity']);
    expect(msg).toContain('Title');
  });

  it('mentions abuse words for profanity violations', () => {
    const msg = buildPostJobContentViolationMessage('Description', ['profanity']);
    expect(msg).toMatch(/abuse words/i);
  });

  it('mentions phone numbers for phone_number violations', () => {
    const msg = buildPostJobContentViolationMessage('Description', ['phone_number']);
    expect(msg).toMatch(/phone numbers/i);
  });

  it('mentions email addresses for email_address violations', () => {
    const msg = buildPostJobContentViolationMessage('Title', ['email_address']);
    expect(msg).toMatch(/email addresses/i);
  });

  it('mentions links/social media for url violations', () => {
    const msg = buildPostJobContentViolationMessage('Title', ['url']);
    expect(msg).toMatch(/links/i);
  });

  it('mentions promotional content for spam violations', () => {
    const msg = buildPostJobContentViolationMessage('Title', ['spam']);
    expect(msg).toMatch(/promotional/i);
  });

  it('mentions location for location violations', () => {
    const msg = buildPostJobContentViolationMessage('Title', ['location']);
    expect(msg).toMatch(/location/i);
  });

  it('handles multiple violation types in one message', () => {
    const msg = buildPostJobContentViolationMessage('Description', ['profanity', 'phone_number']);
    expect(msg).toMatch(/abuse words/i);
    expect(msg).toMatch(/phone numbers/i);
  });

  it('does not end with a trailing comma', () => {
    const msg = buildPostJobContentViolationMessage('Title', ['profanity']);
    expect(msg).not.toMatch(/,\s*$/);
  });

  it('returns message without any violation details for unknown types', () => {
    const msg = buildPostJobContentViolationMessage('Title', ['unknown_type']);
    expect(msg).toContain('Title');
    // Does not crash and returns a string
    expect(typeof msg).toBe('string');
  });
});
