import {
  buildPhoneLookupValues,
  computeIsFullyVerified,
  normalizeEmail,
  normalizeIndianPhone,
} from '../../lib/auth-utils';
import { logger } from '../../lib/logger';
import User from '../../models/User';
import { SignupRequest, SignupResponse } from '../../types/Auth';

import { normalizeSignupLocation } from './signupLocation';
import { UsernameService } from './usernameService';

export class RegistrationService {
  static async registerUser(data: SignupRequest): Promise<SignupResponse> {
    const normalizedEmail = normalizeEmail(data.email);
    const normalizedPhone = normalizeIndianPhone(data.phone);
    const normalizedUsername =
      typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';

    // 1. Check duplicates
    const existingEmail = await User.findByEmail(normalizedEmail);
    if (existingEmail) return { success: false, message: 'Email already exists' };

    if (!normalizedPhone) {
      return { success: false, message: 'A valid phone number is required' };
    }

    const existingPhone = await User.findOne({
      phone: { $in: buildPhoneLookupValues(normalizedPhone) },
    })
      .select('_id')
      .lean();
    if (existingPhone) {
      return { success: false, message: 'Phone number already exists' };
    }

    if (normalizedUsername && (await User.findOne({ username: normalizedUsername }))) {
      return { success: false, message: 'Username taken' };
    }

    // 2. Generate Username if missing
    const username =
      normalizedUsername || (await UsernameService.generateUniqueUsername(normalizedEmail));

    const emailVerified = true;
    const phoneVerified = false;

    // 3. Create User
    const newUser = new User({
      name: data.name,
      email: normalizedEmail,
      passwordHash: data.password, // Model middleware handles hashing
      role: data.role,
      username,
      phone: normalizedPhone,
      authMethod: 'email',
      providers: ['email'],
      isRegistered: true, // Email users complete registration in one go
      emailVerified,
      emailVerifiedAt: emailVerified ? new Date() : undefined,
      phoneVerified,
      phoneVerifiedAt: phoneVerified ? new Date() : undefined,
      isVerified: computeIsFullyVerified(emailVerified, phoneVerified),
      plan: { type: 'free', status: 'active', creditsUsed: 0 },
    });

    if (data.role === 'fixer') {
      newUser.skills = data.skills;
    }

    const normalizedLocation = normalizeSignupLocation(data.location);
    if (normalizedLocation) {
      newUser.location = normalizedLocation;
    }

    await newUser.save();

    // 4. Send Welcome Email (Mock for now, integrate actual mailer later)
    logger.info(
      {
        event: 'welcome_email_queued',
        userId: newUser._id.toString(),
        email: newUser.email,
      },
      'Welcome email queued'
    );

    return {
      success: true,
      message: 'Account created',
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        skills: newUser.role === 'fixer' ? newUser.skills || [] : undefined,
        isRegistered: true,
        authMethod: 'email',
        isVerified: Boolean(newUser.isVerified),
      },
    };
  }
}
