import bcrypt from 'bcryptjs';

import { badRequest, respond, serverError } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  SetupRequestBodySchema,
  getAdminSetupKey,
  getRequestIp,
  isPlainObject,
  toTrimmedString,
  validateAdminFields,
  type AdminData,
  type UserDocument,
} from './helpers';

// SECURITY: This endpoint is disabled in production.
// To use in development: set ADMIN_SETUP_ENABLED=true in .env.local
// Never set ADMIN_SETUP_ENABLED=true in production environment variables.

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
    if ('error' in parsedBody) return parsedBody.error;

    const setupKey = toTrimmedString(parsedBody.data.setupKey);
    if (!setupKey) return badRequest('Setup key is required');

    if (!isPlainObject(parsedBody.data.adminData)) return badRequest('Admin data is required');

    const validation = validateAdminFields(parsedBody.data.adminData as AdminData);
    if (!validation.valid) return badRequest(validation.error);
    const { name, username, email, password } = validation;

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

    const existingUser = await User.findOne({ $or: [{ email }, { username }] }).select('_id');
    if (existingUser) {
      logger.warn({ timestamp, ip, reason: 'user_already_exists' }, '[Admin Setup] Attempt failed');
      return badRequest('Email or username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = new User({
      name, username, email, passwordHash,
      role: 'admin', authMethod: 'email', providers: ['email'],
      isRegistered: true, location: { city: 'Coimbatore', state: 'Tamil Nadu' },
      emailVerified: true, phoneVerified: true, isVerified: true, isActive: true,
      plan: { type: 'pro', status: 'active' },
    }) as UserDocument;

    await admin.save();

    logger.info({ timestamp, ip, adminId: String(admin._id) }, '[Admin Setup] Attempt succeeded');

    return respond(
      {
        success: true,
        message: 'Admin account created successfully',
        admin: { id: admin._id, name: admin.name, username: admin.username, email: admin.email, role: admin.role },
      },
      201
    );
  } catch (error: unknown) {
    logger.error({ error, timestamp, ip, reason: 'internal_error' }, '[Admin Setup] Attempt failed');
    return serverError('Failed to create admin account');
  }
}
