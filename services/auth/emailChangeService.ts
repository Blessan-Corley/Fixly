import { computeIsFullyVerified, invalidateAuthCache, normalizeEmail } from '@/lib/auth-utils';
import { AppError } from '@/lib/api/errors';
import connectDB from '@/lib/mongodb';
import { generateOTP, sendSignupOTP, storeOTP, verifyOTP } from '@/lib/otpService';
import User from '@/models/User';

type EmailChangeSuccessUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  isVerified: boolean;
};

type EmailChangeResult = {
  success: boolean;
  status: number;
  message: string;
  user?: EmailChangeSuccessUser;
  expiresAt?: string;
};

function isTemporarilyUnavailable(message: string | undefined): boolean {
  return typeof message === 'string' && /temporarily unavailable/i.test(message);
}

export function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendEmailChangeOtpForUser(
  userId: string,
  rawNewEmail: unknown
): Promise<EmailChangeResult> {
  try {
    const newEmail = normalizeEmail(rawNewEmail);
    if (!newEmail) {
      return { success: false, status: 400, message: 'New email is required' };
    }

    if (!isValidEmailAddress(newEmail)) {
      return { success: false, status: 400, message: 'Please enter a valid email address' };
    }

    await connectDB();

    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: userId },
    })
      .select('_id')
      .lean();

    if (existingUser) {
      return {
        success: false,
        status: 409,
        message: 'This email address is already registered to another account',
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }

    const otpCode = generateOTP();
    const storeResult = await storeOTP(newEmail, otpCode, 'email_change');
    if (!storeResult.success) {
      return {
        success: false,
        status: isTemporarilyUnavailable(storeResult.message) ? 503 : 500,
        message: storeResult.message || 'Failed to create verification code',
      };
    }

    const sendResult = await sendSignupOTP(newEmail, user.name, otpCode);
    if (!sendResult.success) {
      return {
        success: false,
        status: isTemporarilyUnavailable(sendResult.message) ? 503 : 500,
        message: sendResult.message || 'Failed to send verification code',
      };
    }

    return {
      success: true,
      status: 200,
      message: 'Verification code sent to your new email address. Please check your inbox.',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return { success: false, status: error.status, message: error.message };
    }

    throw error;
  }
}

export async function verifyAndApplyEmailChangeForUser(params: {
  userId: string;
  rawNewEmail: unknown;
  rawOtp: unknown;
  rawCurrentEmail?: unknown;
}): Promise<EmailChangeResult> {
  try {
    const { userId, rawNewEmail, rawOtp, rawCurrentEmail } = params;

    const newEmail = normalizeEmail(rawNewEmail);
    const otp = typeof rawOtp === 'string' ? rawOtp.trim() : '';
    const currentEmail = normalizeEmail(rawCurrentEmail);

    if (!newEmail || !otp) {
      return {
        success: false,
        status: 400,
        message: 'New email and verification code are required',
      };
    }

    if (!isValidEmailAddress(newEmail)) {
      return { success: false, status: 400, message: 'Please enter a valid email address' };
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }

    if (currentEmail && String(user.email || '').toLowerCase() !== currentEmail) {
      return { success: false, status: 400, message: 'Current email does not match' };
    }

    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: userId },
    })
      .select('_id')
      .lean();

    if (existingUser) {
      return {
        success: false,
        status: 409,
        message: 'This email address is already registered to another account',
      };
    }

    if (String(user.email || '').toLowerCase() === newEmail) {
      return { success: false, status: 400, message: 'This is already your current email' };
    }

    const otpResult = await verifyOTP(newEmail, otp, 'email_change');
    if (!otpResult.success) {
      return {
        success: false,
        status: isTemporarilyUnavailable(otpResult.message) ? 503 : 400,
        message: otpResult.message || 'Invalid or expired verification code',
      };
    }

    user.email = newEmail;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.lastActivityAt = new Date();
    user.isVerified = computeIsFullyVerified(user.emailVerified, user.phoneVerified);
    await user.save();
    await invalidateAuthCache(String(user._id));

    return {
      success: true,
      status: 200,
      message: 'Email address changed successfully!',
      user: {
        id: String(user._id),
        email: user.email,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified,
      },
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return { success: false, status: error.status, message: error.message };
    }

    throw error;
  }
}
