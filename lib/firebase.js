// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import admin from 'firebase-admin';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_URL,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firebase Admin (server-side)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET_URL
    });
  } catch (error) {
    console.log('Firebase admin initialization error', error.stack);
  }
}

export const adminAuth = admin.auth();
export const adminStorage = admin.storage();

// Phone Authentication Class
export class PhoneAuth {
  constructor() {
    this.recaptchaVerifier = null;
    this.confirmationResult = null;
  }

  async sendOTP(phoneNumber, recaptchaContainerId) {
    try {
      // Format phone number
      const formattedPhone = phoneNumber.startsWith('+91') 
        ? phoneNumber 
        : `+91${phoneNumber.replace(/[^\d]/g, '')}`;

      // Setup reCAPTCHA
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(
          recaptchaContainerId,
          {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
            }
          },
          auth
        );
      }

      // Send OTP
      this.confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        this.recaptchaVerifier
      );

      return { success: true };
    } catch (error) {
      console.error('OTP send error:', error);
      
      // Reset reCAPTCHA on error
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }

      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  }

  async verifyOTP(otp) {
    try {
      if (!this.confirmationResult) {
        throw new Error('No OTP sent. Please request OTP first.');
      }

      const result = await this.confirmationResult.confirm(otp);
      
      // Clear verifier after successful verification
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }

      return { 
        success: true, 
        user: result.user,
        phoneNumber: result.user.phoneNumber
      };
    } catch (error) {
      console.error('OTP verify error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  }

  getErrorMessage(errorCode) {
    switch (errorCode) {
      case 'auth/invalid-phone-number':
        return 'Invalid phone number format';
      case 'auth/missing-phone-number':
        return 'Phone number is required';
      case 'auth/quota-exceeded':
        return 'SMS quota exceeded. Please try again later';
      case 'auth/user-disabled':
        return 'This phone number has been disabled';
      case 'auth/operation-not-allowed':
        return 'Phone authentication is not enabled';
      case 'auth/invalid-verification-code':
        return 'Invalid OTP. Please check and try again';
      case 'auth/invalid-verification-id':
        return 'Invalid verification session. Please request new OTP';
      case 'auth/code-expired':
        return 'OTP has expired. Please request a new one';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      default:
        return 'An error occurred. Please try again';
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

// Rate Limiting for OTP
export class RateLimiter {
  static getStorageKey(phone) {
    return `otp_attempts_${phone.replace(/[^\d]/g, '')}`;
  }

  static canSendOTP(phone) {
    if (typeof window === 'undefined') return { allowed: true };
    
    const key = this.getStorageKey(phone);
    const data = localStorage.getItem(key);
    
    if (!data) return { allowed: true };
    
    const attempts = JSON.parse(data);
    const now = Date.now();
    
    // Clean old attempts (older than 1 hour)
    const validAttempts = attempts.filter(time => now - time < 60 * 60 * 1000);
    
    if (validAttempts.length >= 5) {
      const oldestAttempt = Math.min(...validAttempts);
      const waitTime = Math.ceil((60 * 60 * 1000 - (now - oldestAttempt)) / 1000 / 60);
      return {
        allowed: false,
        message: `Too many OTP requests. Please wait ${waitTime} minutes.`
      };
    }
    
    return { allowed: true };
  }

  static recordOTPAttempt(phone) {
    if (typeof window === 'undefined') return;
    
    const key = this.getStorageKey(phone);
    const data = localStorage.getItem(key);
    const attempts = data ? JSON.parse(data) : [];
    const now = Date.now();
    
    // Add current attempt
    attempts.push(now);
    
    // Keep only last 10 attempts
    const recentAttempts = attempts.slice(-10);
    
    localStorage.setItem(key, JSON.stringify(recentAttempts));
  }
}

// File Upload Helper
export async function uploadFile(file, path) {
  try {
    const bucket = adminStorage.bucket();
    const fileName = `${path}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', async () => {
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(publicUrl);
      });
      stream.end(file.buffer);
    });
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}