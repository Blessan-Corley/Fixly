import { respond } from '@/lib/api';
import { isTemporarilyUnavailable } from '@/lib/api/request';
import { buildPhoneLookupValues, normalizeEmail, normalizeIndianPhone } from '@/lib/auth-utils';
import { sendSignupOTP, sendPasswordResetOTP, generateOTP, storeOTP } from '@/lib/otpService';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import User from '@/models/User';

import type { OtpPurpose } from './types';

type SessionShape = {
  user?: {
    id?: string;
    email?: string | null;
  };
} | null;

export async function handlePhoneOtp(
  phone: string,
  purpose: OtpPurpose
): Promise<Response> {
  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    return respond({ message: 'Invalid phone number' }, 400);
  }

  // Silently succeed if phone already registered — prevents user enumeration
  if (purpose === 'signup') {
    const existingUser = await User.findOne({
      phone: { $in: buildPhoneLookupValues(normalizedPhone) },
    });
    if (existingUser) {
      return respond({ success: true, message: 'OTP sent via WhatsApp' });
    }
  }

  const otp = generateOTP();
  const storeResult = await storeOTP(normalizedPhone, otp, purpose);
  if (!storeResult.success) {
    return respond(
      { message: storeResult.message || 'Failed to store OTP' },
      isTemporarilyUnavailable(storeResult.message) ? 503 : 500
    );
  }

  const sent = await sendWhatsAppOTP(normalizedPhone.replace('+', ''), otp);
  if (sent) {
    return respond({ success: true, message: 'OTP sent via WhatsApp' });
  }
  return respond({ message: 'Failed to send WhatsApp message' }, 500);
}

export async function handleEmailOtp(
  email: string,
  purpose: OtpPurpose,
  name: string,
  currentEmail: string,
  session: SessionShape
): Promise<Response> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond({ message: 'Invalid email address' }, 400);
  }

  if (purpose === 'signup') {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return respond({ success: true, message: 'OTP sent to email' });
    }
    const otpResult = await sendSignupOTP(email, name || 'User');
    if (!otpResult.success) {
      return respond(
        { message: otpResult.message || 'Failed to send OTP' },
        isTemporarilyUnavailable(otpResult.message) ? 503 : 500
      );
    }
    return respond({ success: true, message: 'OTP sent to email' });
  }

  if (purpose === 'password_reset') {
    const user = await User.findByEmail(email);
    if (user) {
      const otpResult = await sendPasswordResetOTP(email, user.name);
      if (!otpResult.success && isTemporarilyUnavailable(otpResult.message)) {
        return respond({ message: otpResult.message }, 503);
      }
    }
    return respond({ success: true, message: 'If account exists, OTP sent' });
  }

  // email_verification | email_change | username_change
  const sessionEmail = normalizeEmail(session?.user?.email);
  if (!sessionEmail) {
    return respond({ message: 'Authentication required' }, 401);
  }

  if (purpose === 'email_verification' || purpose === 'username_change') {
    if (email !== sessionEmail) {
      return respond({ message: 'Email does not match the active session' }, 400);
    }
  }

  if (purpose === 'email_change') {
    if (!currentEmail) {
      return respond({ message: 'Current email is required' }, 400);
    }
    if (currentEmail !== sessionEmail) {
      return respond({ message: 'Current email does not match the active session' }, 400);
    }
    if (email === sessionEmail) {
      return respond({ message: 'New email must be different from your current email' }, 400);
    }
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return respond({ message: 'Email already registered' }, 409);
    }
  }

  const otp = generateOTP();
  const storeResult = await storeOTP(email, otp, purpose);
  if (!storeResult.success) {
    return respond(
      { message: storeResult.message || 'Failed to generate OTP' },
      isTemporarilyUnavailable(storeResult.message) ? 503 : 500
    );
  }

  const emailResult = await sendSignupOTP(email, name || 'User', otp);
  if (!emailResult.success) {
    return respond(
      { message: emailResult.message || 'Failed to send OTP' },
      isTemporarilyUnavailable(emailResult.message) ? 503 : 500
    );
  }

  return respond({ success: true, message: 'OTP sent to email' });
}
