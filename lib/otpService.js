// lib/otpService.js - OTP generation and verification service with Redis
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { redisUtils, redisRateLimit, initRedis } from './redis.js';

// OTP expiry time (5 minutes)
const OTP_EXPIRY_TIME = 5 * 60; // 300 seconds for Redis

// Initialize Redis on module load
initRedis();

// OTP Redis wrapper using redisUtils
const otpRedis = {
  async store(email, otp, purpose, ttl) {
    const key = `otp:${email}:${purpose}`;
    return await redisUtils.set(key, JSON.stringify({ otp, createdAt: Date.now() }), ttl);
  },

  async verify(email, inputOTP, purpose) {
    const key = `otp:${email}:${purpose}`;
    const data = await redisUtils.get(key);

    if (!data) {
      return { success: false, message: 'OTP not found or expired' };
    }

    try {
      // Redis (Upstash) auto-parses JSON, so data might already be an object
      let otpData = data;
      if (typeof data === 'string') {
        otpData = JSON.parse(data);
      }

      const { otp } = otpData;
      // Convert both to strings for comparison to avoid type mismatches
      const storedOTP = String(otp);
      const providedOTP = String(inputOTP);

      console.log(`🔍 OTP comparison - Stored: ${storedOTP}, Provided: ${providedOTP}`);

      if (storedOTP === providedOTP) {
        await redisUtils.del(key); // Delete after successful verification
        return { success: true, message: 'OTP verified successfully' };
      } else {
        return { success: false, message: 'Invalid OTP' };
      }
    } catch (error) {
      console.error('❌ OTP parse error:', error);
      console.error('Data received:', data);
      return { success: false, message: 'Error verifying OTP' };
    }
  },

  async checkStatus(email, purpose) {
    const key = `otp:${email}:${purpose}`;
    const exists = await redisUtils.exists(key);
    return { exists, expired: !exists };
  }
};

// Create SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_EMAIL,
      pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD
    }
  });
};

// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiry using Redis
export const storeOTP = async (email, otp, purpose = 'verification') => {
  try {
    const success = await otpRedis.store(email, otp, purpose, OTP_EXPIRY_TIME);

    if (success) {
      console.log(`📧 OTP stored in Redis for ${email} (${purpose}): ${otp}`);
      return { success: true, message: 'OTP stored successfully' };
    } else {
      console.error(`❌ Failed to store OTP in Redis for ${email}`);
      return { success: false, message: 'Failed to store OTP' };
    }
  } catch (error) {
    console.error('💥 Error storing OTP:', error);
    return { success: false, message: 'Error storing OTP' };
  }
};

// Verify OTP using Redis
export const verifyOTP = async (email, inputOTP, purpose = 'verification') => {
  try {
    return await otpRedis.verify(email, inputOTP, purpose);
  } catch (error) {
    console.error('💥 Error verifying OTP:', error);
    return {
      success: false,
      message: 'Error verifying OTP. Please try again.'
    };
  }
};

// Send OTP email for signup verification
export const sendSignupOTP = async (email, name, otp = null) => {
  try {
    // Use provided OTP or generate new one (for backward compatibility)
    const otpCode = otp || generateOTP();
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Fixly',
        address: process.env.EMAIL_USER || process.env.SMTP_EMAIL
      },
      to: email,
      subject: 'Verify Your Email - Fixly Account Setup',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Fixly</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Your Local Services Platform</p>
            </div>

            <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Email Address</h2>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Hi ${name || 'there'},
            </p>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
              Thank you for signing up with Fixly! To complete your account setup, please verify your email address using the OTP below:
            </p>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <h1 style="color: #2563eb; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otpCode}</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">This OTP will expire in 5 minutes</p>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Enter this OTP on the signup page to verify your email and continue with your account setup.
            </p>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Security Note:</strong> If you didn't request this verification, please ignore this email. Your account is safe.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                © 2025 Fixly. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                This is an automated email, please do not reply.
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // Don't store OTP here if it was already provided (stored in send-otp route)
    if (!otp) {
      const storeResult = await storeOTP(email, otpCode, 'signup');
      if (!storeResult.success) {
        throw new Error('Failed to store OTP');
      }
    }

    console.log(`✅ Signup OTP sent to ${email}`);
    return {
      success: true,
      message: 'OTP sent successfully to your email address.',
      expiresIn: OTP_EXPIRY_TIME
    };

  } catch (error) {
    console.error('❌ Error sending signup OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.'
    };
  }
};

// Send OTP email for password reset
export const sendPasswordResetOTP = async (email, name) => {
  try {
    const otp = generateOTP();
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Fixly',
        address: process.env.EMAIL_USER || process.env.SMTP_EMAIL
      },
      to: email,
      subject: 'Reset Your Password - Fixly Account Recovery',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Fixly</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Your Local Services Platform</p>
            </div>

            <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Hi ${name || 'there'},
            </p>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password for your Fixly account. Use the OTP below to verify your identity and proceed with password reset:
            </p>

            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px solid #fecaca;">
              <h1 style="color: #dc2626; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
              <p style="color: #991b1b; margin: 10px 0 0 0; font-size: 14px;">This OTP will expire in 5 minutes</p>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Enter this OTP on the password reset page to verify your identity and create a new password.
            </p>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Security Alert:</strong> If you didn't request this password reset, someone may be trying to access your account. Please contact our support team immediately.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                © 2025 Fixly. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                This is an automated email, please do not reply.
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    const storeResult = await storeOTP(email, otp, 'password_reset');

    if (storeResult.success) {
      console.log(`✅ Password reset OTP sent to ${email}`);
      return {
        success: true,
        message: 'Password reset OTP sent successfully to your email address.',
        expiresIn: OTP_EXPIRY_TIME
      };
    } else {
      throw new Error('Failed to store OTP');
    }

  } catch (error) {
    console.error('❌ Error sending password reset OTP:', error);
    return {
      success: false,
      message: 'Failed to send password reset OTP. Please try again.'
    };
  }
};

// Check if OTP exists and is valid (without verifying) using Redis
export const checkOTPStatus = async (email, purpose = 'verification') => {
  try {
    return await otpRedis.checkStatus(email, purpose);
  } catch (error) {
    console.error('💥 Error checking OTP status:', error);
    return { exists: false, expired: true };
  }
};

export default {
  generateOTP,
  storeOTP,
  verifyOTP,
  sendSignupOTP,
  sendPasswordResetOTP,
  checkOTPStatus
};