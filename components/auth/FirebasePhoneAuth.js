// components/auth/FirebasePhoneAuth.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/lib/firebase-client';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { toast } from 'sonner';
import { Phone, Loader, CheckCircle, Send, RefreshCw, Clock, AlertCircle } from 'lucide-react';

export default function FirebasePhoneAuth({ phoneNumber, onVerificationComplete, onError }) {
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('send'); // 'send', 'verify', 'completed'
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  // Use refs for Firebase objects to avoid memory leaks
  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  // Validate phone number
  const validatePhone = useCallback((phone) => {
    if (!phone) return { valid: false, error: 'Phone number is required' };

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return { valid: false, error: 'Phone number must be 10 digits' };
    if (!digits.match(/^[6-9]\d{9}$/)) return { valid: false, error: 'Invalid Indian mobile number' };

    return { valid: true };
  }, []);

  // Start cooldown timer
  const startCooldown = useCallback((seconds = 60) => {
    setResendCooldown(seconds);

    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Initialize reCAPTCHA
  const initializeRecaptcha = useCallback(() => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    // Clear existing verifier
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (error) {
        console.warn('Failed to clear existing reCAPTCHA:', error);
      }
      recaptchaVerifierRef.current = null;
    }

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('✅ reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('❌ reCAPTCHA expired');
          setError('Security verification expired. Please try again.');
        },
        'error-callback': (error) => {
          console.error('❌ reCAPTCHA error:', error);
          setError('Security verification failed. Please refresh and try again.');
        }
      });

      console.log('✅ reCAPTCHA initialized');
    } catch (error) {
      console.error('❌ reCAPTCHA initialization failed:', error);
      throw new Error('Failed to initialize security verification');
    }
  }, []);

  // Send OTP
  const sendOTP = useCallback(async () => {
    const validation = validatePhone(phoneNumber);
    if (!validation.valid) {
      setError(validation.error);
      toast.error(validation.error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('📱 Starting OTP process for:', phoneNumber);

      // Initialize reCAPTCHA
      if (!recaptchaVerifierRef.current) {
        initializeRecaptcha();
      }

      // Format phone number
      const formattedPhone = `+91${phoneNumber.replace(/\D/g, '')}`;
      console.log('📞 Formatted phone:', formattedPhone);

      // Send SMS
      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current
      );

      console.log('✅ OTP sent successfully');
      setStep('verify');
      startCooldown(60);
      toast.success('📱 Verification code sent to your phone');

    } catch (error) {
      console.error('❌ Failed to send OTP:', error);

      let errorMessage = 'Failed to send verification code';

      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'Invalid phone number format';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 'auth/captcha-check-failed':
          errorMessage = 'Security verification failed. Please try again.';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'SMS service temporarily unavailable. Please try again later.';
          break;
        default:
          console.error('Unexpected error:', error);
      }

      setError(errorMessage);
      toast.error(errorMessage);
      onError?.(error);

      // Clear Firebase objects on error
      cleanup();
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, validatePhone, initializeRecaptcha, startCooldown, onError]);

  // Verify OTP
  const verifyOTP = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      const error = 'Please enter a valid 6-digit code';
      setError(error);
      toast.error(error);
      return;
    }

    if (!confirmationResultRef.current) {
      const error = 'Verification session expired. Please request a new code.';
      setError(error);
      toast.error(error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Verifying OTP:', otp);

      // Verify with Firebase
      const result = await confirmationResultRef.current.confirm(otp);
      const firebaseUser = result.user;

      console.log('✅ Firebase verification successful');

      // Call backend
      const response = await fetch('/api/auth/verify-phone-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: firebaseUser.phoneNumber,
          firebaseCredential: {
            verificationId: confirmationResultRef.current.verificationId,
            verificationCode: otp
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Backend verification successful');
        setStep('completed');
        toast.success('✅ Phone number verified successfully!');
        onVerificationComplete?.(data);
      } else {
        throw new Error(data.message || 'Backend verification failed');
      }

    } catch (error) {
      console.error('❌ OTP verification failed:', error);

      let errorMessage = 'Invalid verification code';

      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Invalid verification code. Please try again.';
          break;
        case 'auth/code-expired':
          errorMessage = 'Verification code expired. Please request a new one.';
          break;
        default:
          errorMessage = error.message || 'Verification failed. Please try again.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [otp, onVerificationComplete, onError]);

  // Cleanup Firebase objects
  const cleanup = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (error) {
        console.warn('Failed to clear reCAPTCHA:', error);
      }
      recaptchaVerifierRef.current = null;
    }
    confirmationResultRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [cleanup]);

  if (step === 'completed') {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Phone verified successfully!</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" className="hidden"></div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {step === 'send' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Phone className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Verify Phone Number</p>
              <p className="text-sm text-blue-700">+91{phoneNumber}</p>
            </div>
          </div>

          <button
            onClick={sendOTP}
            disabled={loading || resendCooldown > 0}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : resendCooldown > 0 ? (
              <>
                <Clock className="h-4 w-4" />
                Wait {resendCooldown}s
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Verification Code
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            📱 A free SMS will be sent to verify your number
          </p>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Code Sent!</p>
              <p className="text-sm text-green-700">Check your SMS for the verification code</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit verification code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                setError('');
              }}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <button
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Verify Phone Number
              </>
            )}
          </button>

          <button
            onClick={sendOTP}
            disabled={loading || resendCooldown > 0}
            className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
          >
            {resendCooldown > 0 ? (
              <>
                <Clock className="h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Resend Code
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}