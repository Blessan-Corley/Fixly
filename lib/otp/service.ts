import { AppError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { sendOtpEmail } from '@/lib/services/emailService';

import { generateOTP } from './hashing';
import {
  OTP_EXPIRY_TIME_SECONDS,
  OTP_SERVICE_UNAVAILABLE_MESSAGE,
  canUseInMemoryFallback,
  otpStorage,
} from './storage';
import type { OtpResponse, OtpStatusResponse, VerifyOtpResponse } from './types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getOtpServiceUnavailableResponse(): OtpResponse {
  return { success: false, message: OTP_SERVICE_UNAVAILABLE_MESSAGE };
}

function getOtpVerificationUnavailableResponse(): VerifyOtpResponse {
  return { success: false, message: OTP_SERVICE_UNAVAILABLE_MESSAGE };
}

export async function storeOTP(
  identifier: string,
  otp: string,
  purpose = 'verification'
): Promise<OtpResponse> {
  try {
    const success = await otpStorage.store(identifier, otp, purpose, OTP_EXPIRY_TIME_SECONDS);
    if (success) {
      return { success: true, message: 'OTP stored successfully' };
    }

    return {
      success: false,
      message: !canUseInMemoryFallback() ? OTP_SERVICE_UNAVAILABLE_MESSAGE : 'Failed to store OTP',
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    if (!canUseInMemoryFallback()) {
      return getOtpServiceUnavailableResponse();
    }

    return {
      success: false,
      message: `Error storing OTP: ${getErrorMessage(error)}`,
    };
  }
}

export async function verifyOTP(
  identifier: string,
  inputOtp: string,
  purpose = 'verification'
): Promise<VerifyOtpResponse> {
  try {
    return await otpStorage.verify(identifier, inputOtp, purpose);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('[OTP] verifyOTP failed:', getErrorMessage(error));
    if (!canUseInMemoryFallback()) {
      return getOtpVerificationUnavailableResponse();
    }
    return { success: false, message: 'Error verifying OTP. Please try again.' };
  }
}

export async function consumeOTPVerification(
  identifier: string,
  purpose = 'verification'
): Promise<boolean> {
  try {
    return await otpStorage.consumeVerification(identifier, purpose);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('[OTP] consumeOTPVerification failed:', getErrorMessage(error));
    return false;
  }
}

export async function hasOTPVerification(
  identifier: string,
  purpose = 'verification'
): Promise<boolean> {
  try {
    return await otpStorage.hasVerification(identifier, purpose);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('[OTP] hasOTPVerification failed:', getErrorMessage(error));
    return false;
  }
}

export async function sendSignupOTP(
  email: string,
  _name: string,
  otp: string | null = null
): Promise<OtpResponse & { expiresIn?: number }> {
  try {
    const otpCode = otp ?? generateOTP();
    if (!otp) {
      const storeResult = await storeOTP(email, otpCode, 'signup');
      if (!storeResult.success) {
        return { success: false, message: storeResult.message };
      }
    }

    await sendOtpEmail(email, otpCode, 'signup');

    return {
      success: true,
      message: 'OTP sent successfully to your email address.',
      expiresIn: OTP_EXPIRY_TIME_SECONDS,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('[OTP] sendSignupOTP failed:', getErrorMessage(error));
    return {
      success: false,
      message: !canUseInMemoryFallback()
        ? OTP_SERVICE_UNAVAILABLE_MESSAGE
        : 'Failed to send OTP. Please try again.',
    };
  }
}

export async function sendPasswordResetOTP(
  email: string,
  _name: string
): Promise<OtpResponse & { expiresIn?: number }> {
  try {
    const otp = generateOTP();
    const storeResult = await storeOTP(email, otp, 'password_reset');
    if (!storeResult.success) {
      return { success: false, message: 'Failed to store OTP' };
    }

    await sendOtpEmail(email, otp, 'password_reset');

    return {
      success: true,
      message: 'Password reset OTP sent successfully to your email address.',
      expiresIn: OTP_EXPIRY_TIME_SECONDS,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('[OTP] sendPasswordResetOTP failed:', getErrorMessage(error));
    return {
      success: false,
      message: !canUseInMemoryFallback()
        ? OTP_SERVICE_UNAVAILABLE_MESSAGE
        : 'Failed to send password reset OTP. Please try again.',
    };
  }
}

export async function checkOTPStatus(
  identifier: string,
  purpose = 'verification'
): Promise<OtpStatusResponse> {
  try {
    return await otpStorage.checkStatus(identifier, purpose);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('[OTP] checkOTPStatus failed:', getErrorMessage(error));
    return { exists: false, expired: true };
  }
}

const otpService = {
  generateOTP,
  storeOTP,
  verifyOTP,
  hasOTPVerification,
  consumeOTPVerification,
  sendSignupOTP,
  sendPasswordResetOTP,
  checkOTPStatus,
};

export default otpService;
