import { z } from 'zod';

import type { PasswordValidationResult } from '../../types/profile';

const PROFILE_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
const PROFILE_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const profileLocationSchema = z
  .object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    name: z.string().optional(),
    accuracy: z.number().optional(),
    source: z.string().optional(),
    doorNo: z.string().optional(),
    street: z.string().optional(),
    route: z.string().optional(),
    district: z.string().optional(),
    locality: z.string().optional(),
    postalCode: z.string().optional(),
    postal_code: z.string().optional(),
    formatted_address: z.string().optional(),
    address: z.string().optional(),
  })
  .passthrough();

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  location: profileLocationSchema.optional(),
  skills: z.array(z.string().min(1).max(50)).max(50).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  profilePhoto: z.record(z.string(), z.unknown()).nullable().optional(),
  availableNow: z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    return value;
  }, z.boolean()).optional(),
  serviceRadius: z.coerce.number().min(1).max(50).optional(),
});

export function validatePasswordRequirements(password: string): PasswordValidationResult {
  const minLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: minLength && hasLetter && hasNumber && hasSpecial,
    requirements: {
      minLength,
      hasLetter,
      hasNumber,
      hasSpecial,
    },
  };
}

export function sanitizeOtpDigits(value: string, maxLength: number = 6): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function sanitizeIndianPhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function validateProfilePhotoFile(file: File): string | null {
  if (
    !PROFILE_PHOTO_ALLOWED_TYPES.includes(file.type as (typeof PROFILE_PHOTO_ALLOWED_TYPES)[number])
  ) {
    return 'Only JPEG, PNG, and WebP images are allowed';
  }

  if (file.size > PROFILE_PHOTO_MAX_SIZE_BYTES) {
    return 'File size must be less than 5MB';
  }

  return null;
}
