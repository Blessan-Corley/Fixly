import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { z } from 'zod';

import { badRequest, respond, serverError } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import type { IUser } from '@/types/User';
import { rateLimit } from '@/utils/rateLimiting';

// SECURITY: This endpoint is disabled in production.
// To use in development: set ADMIN_SETUP_ENABLED=true in .env.local
// Never set ADMIN_SETUP_ENABLED=true in production environment variables.

type SetupRequestBody = {
  setupKey?: unknown;
  adminData?: unknown;
};

type AdminData = {
  name?: unknown;
  username?: unknown;
  email?: unknown;
  password?: unknown;
};

const SetupRequestBodySchema: z.ZodType<SetupRequestBody> = z.object({
  setupKey: z.unknown().optional(),
  adminData: z.unknown().optional(),
});

type UserDocument = IUser & {
  _id: Types.ObjectId;
  save: () => Promise<unknown>;
};

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeEmail(value: string): string {
  return value.toLowerCase();
}

function normalizeUsername(value: string): string {
  return value.toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUsername(value: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

function getAdminSetupKey(): string | null {
  const configured = toTrimmedString(env.ADMIN_SETUP_KEY);
  return configured;
}

function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const forwardedIp = forwardedFor.split(',')[0]?.trim();
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  return realIp?.trim() || 'unknown';
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  const ip = getRequestIp(request);

  try {
    if (env.NODE_ENV === 'production') {
      logger.warn({ timestamp, ip, reason: 'disabled_in_production' }, '[Admin Setup] Attempt blocked');
      return respond({ error: 'This endpoint is disabled in production' }, 405);
    }

    if (env.ADMIN_SETUP_ENABLED !== 'true') {
      logger.warn({ timestamp, ip, reason: 'setup_not_enabled' }, '[Admin Setup] Attempt blocked');
      return respond({ error: 'Admin setup is not enabled' }, 403);
    }

    const rateLimitResult = await rateLimit(request, 'admin_setup', 3, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      logger.warn({ timestamp, ip, reason: 'rate_limited' }, '[Admin Setup] Attempt blocked');
      return respond({ message: 'Too many setup attempts. Please try again later.' }, 429);
    }

    const parsedBody = await parseBody(request, SetupRequestBodySchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }
    const requestBody: SetupRequestBody = parsedBody.data;

    const setupKey = toTrimmedString(requestBody.setupKey);
    if (!setupKey) {
      return badRequest('Setup key is required');
    }

    if (!isPlainObject(requestBody.adminData)) {
      return badRequest('Admin data is required');
    }
    const adminData = requestBody.adminData as AdminData;

    const name = toTrimmedString(adminData.name);
    const usernameRaw = toTrimmedString(adminData.username);
    const emailRaw = toTrimmedString(adminData.email);
    const password = toTrimmedString(adminData.password);

    if (!name || !usernameRaw || !emailRaw || !password) {
      return badRequest('All fields are required');
    }

    const username = normalizeUsername(usernameRaw);
    const email = normalizeEmail(emailRaw);

    if (!isValidUsername(username)) {
      return badRequest(
        'Username must be 3-20 chars and contain only lowercase letters, numbers, and underscores'
      );
    }

    if (!isValidEmail(email)) {
      return badRequest('Invalid email address');
    }

    if (password.length < 8) {
      return badRequest('Password must be at least 8 characters');
    }

    const adminSetupKey = getAdminSetupKey();
    if (!adminSetupKey) {
      logger.error({ timestamp, ip, reason: 'setup_key_not_configured' }, '[Admin Setup] Attempt failed');
      return respond({ message: 'Admin setup is not configured' }, 503);
    }

    if (setupKey !== adminSetupKey) {
      logger.warn({ timestamp, ip, reason: 'invalid_setup_key' }, '[Admin Setup] Attempt failed');
      return respond({ message: 'Invalid setup key' }, 401);
    }

    await connectDB();

    const existingAdmin = await User.findOne({ role: 'admin' }).select('_id');
    if (existingAdmin) {
      logger.warn({ timestamp, ip, reason: 'admin_already_exists' }, '[Admin Setup] Attempt failed');
      return badRequest('Admin already exists');
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    }).select('_id');
    if (existingUser) {
      logger.warn({ timestamp, ip, reason: 'user_already_exists' }, '[Admin Setup] Attempt failed');
      return badRequest('Email or username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = new User({
      name,
      username,
      email,
      passwordHash,
      role: 'admin',
      authMethod: 'email',
      providers: ['email'],
      isRegistered: true,
      location: {
        city: 'Coimbatore',
        state: 'Tamil Nadu',
      },
      emailVerified: true,
      phoneVerified: true,
      isVerified: true,
      isActive: true,
      plan: {
        type: 'pro',
        status: 'active',
      },
    }) as UserDocument;

    await admin.save();

    logger.info({ timestamp, ip, adminId: String(admin._id) }, '[Admin Setup] Attempt succeeded');

    return respond(
      {
        success: true,
        message: 'Admin account created successfully',
        admin: {
          id: admin._id,
          name: admin.name,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      },
      201
    );
  } catch (error: unknown) {
    logger.error({ error, timestamp, ip, reason: 'internal_error' }, '[Admin Setup] Attempt failed');
    return serverError('Failed to create admin account');
  }
}
