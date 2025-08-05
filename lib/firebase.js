// ============================================
// lib/firebase.js - Client-side Firebase
// ============================================
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (only once)
let app;
if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
} else if (typeof window !== 'undefined') {
  app = getApps()[0];
}

export const auth = typeof window !== 'undefined' ? getAuth(app) : null;

// Phone Authentication Class
export class PhoneAuth {
  constructor() {
    this.confirmationResult = null;
    this.recaptchaVerifier = null;
  }

  async sendOTP(phoneNumber, recaptchaContainerId) {
    try {
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }

      console.log('📱 Sending OTP to:', phoneNumber);

      // Clean and format phone number
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
      const formattedPhone = `+91${cleanPhone}`;

      // Initialize reCAPTCHA
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
            this.cleanup();
          }
        });
      }

      // Send OTP
      this.confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        this.recaptchaVerifier
      );

      console.log('✅ OTP sent successfully');
      return {
        success: true,
        message: 'OTP sent successfully'
      };

    } catch (error) {
      console.error('❌ OTP send error:', error);
      this.cleanup();
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'reCAPTCHA verification failed. Please refresh and try again.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async verifyOTP(otpCode) {
    try {
      if (!this.confirmationResult) {
        throw new Error('No OTP session found. Please request a new OTP.');
      }

      console.log('🔐 Verifying OTP:', otpCode);

      const result = await this.confirmationResult.confirm(otpCode);
      const user = result.user;

      console.log('✅ OTP verified successfully:', user.phoneNumber);

      return {
        success: true,
        phoneNumber: user.phoneNumber,
        firebaseUid: user.uid,
        message: 'Phone number verified successfully'
      };

    } catch (error) {
      console.error('❌ OTP verify error:', error);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP code. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP has expired. Please request a new one.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  cleanup() {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    this.confirmationResult = null;
  }
}

// Rate Limiter for OTP
export class RateLimiter {
  static otpAttempts = new Map();

  static canSendOTP(phoneNumber) {
    const key = phoneNumber.replace(/[^\d]/g, '');
    const now = Date.now();
    const attempts = this.otpAttempts.get(key) || [];
    
    // Remove attempts older than 1 hour
    const recentAttempts = attempts.filter(time => now - time < 60 * 60 * 1000);
    
    if (recentAttempts.length >= 5) {
      return {
        allowed: false,
        message: 'Too many OTP attempts. Please try again after 1 hour.'
      };
    }

    // Check if last attempt was less than 60 seconds ago
    if (recentAttempts.length > 0) {
      const lastAttempt = Math.max(...recentAttempts);
      const timeSinceLastAttempt = now - lastAttempt;
      
      if (timeSinceLastAttempt < 60 * 1000) {
        const waitTime = Math.ceil((60 * 1000 - timeSinceLastAttempt) / 1000);
        return {
          allowed: false,
          message: `Please wait ${waitTime} seconds before requesting another OTP.`
        };
      }
    }

    return { allowed: true };
  }

  static recordOTPAttempt(phoneNumber) {
    const key = phoneNumber.replace(/[^\d]/g, '');
    const attempts = this.otpAttempts.get(key) || [];
    attempts.push(Date.now());
    this.otpAttempts.set(key, attempts);
  }
}
