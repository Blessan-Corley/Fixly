import { z } from 'zod';

import { RESERVED_USERNAMES } from './username';

const signupAuthMethodSchema = z.enum(['email', 'google'], {
  message: 'Please select a valid authentication method',
});

// Reusable Schemas
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores allowed')
  .regex(/^(?!_)(?!.*_$)/, 'Cannot start or end with underscore')
  .regex(/^(?!.*__)/, 'Cannot contain consecutive underscores')
  .refine((val) => !/^\d+$/.test(val), 'Username cannot be only numbers')
  .refine((val) => !RESERVED_USERNAMES.has(val), 'This username is reserved');

export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
  .refine((val) => /^[6-9]/.test(val), 'Invalid Indian phone number');

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(5, 'Email is too short');

// Location Schema (Backend expects this structure)
const locationSchema = z.object({
  homeAddress: z.object({
    formattedAddress: z.string().min(1, 'Address is required'),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    // Allow other fields loosely or define strictly if needed
    doorNo: z.string().optional(),
    street: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  currentLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
      source: z.string().optional(),
    })
    .optional(),
});

// Legacy location format still used by older clients/tests
const legacyLocationSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Step 1: Auth Method
export const signupStep1Schema = z.object({
  authMethod: signupAuthMethodSchema,
  role: z
    .enum(['hirer', 'fixer'], {
      message: 'Please select a role (Hirer or Fixer)',
    })
    .optional(), // Role might be in URL, so optional here but required overall
});

// Step 2: Credentials (Email/Password)
export const signupStep2Schema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Step 3: Profile & Identity
export const signupStep3Schema = z.object({
  name: z.string().min(2, 'Name is required'),
  username: usernameSchema,
  phone: phoneSchema,
  // We assume OTP verification is checked separately by state,
  // but the phone format is validated here.
});

// Step 4: Location & Skills
export const signupStep4Schema = z
  .object({
    address: z.unknown().refine((value): value is { formatted: string } => {
      if (!value || typeof value !== 'object') {
        return false;
      }

      const candidate = value as { formatted?: unknown };
      return typeof candidate.formatted === 'string' && candidate.formatted.trim().length > 0;
    }, 'Address is required'), // Frontend "address" state object
    role: z.enum(['hirer', 'fixer']),
    skills: z.array(z.string()).optional(),
    termsAccepted: z.literal(true, { message: 'You must accept the terms and conditions' }),
  })
  .refine(
    (data) => {
      if (data.role === 'fixer') {
        return data.skills && data.skills.length >= 3;
      }
      return true;
    },
    {
      message: 'Please select at least 3 skills',
      path: ['skills'],
    }
  );

// Master API Schema
export const signupApiSchema = z.object({
  authMethod: signupAuthMethodSchema,
  role: z.enum(['hirer', 'fixer']),
  email: emailSchema,

  // Conditional fields based on auth method
  password: passwordSchema.optional(),
  googleId: z.string().optional(),
  picture: z.string().optional(),

  // Profile
  name: z.string().min(2),
  username: usernameSchema,
  phone: z.string().optional(), // Transformed/Normalized before this check usually

  // Location
  location: z.union([locationSchema, legacyLocationSchema]).optional(), // Support both new and legacy payloads

  // Fixer
  skills: z.array(z.string()).optional(),

  isGoogleCompletion: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
});
