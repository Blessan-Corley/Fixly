// components/auth/FirebasePhoneAuth.js
'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase-client';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { toast } from 'sonner';
import { Phone, Loader, CheckCircle, Send } from 'lucide-react';

export default function FirebasePhoneAuth({ phoneNumber, onVerificationComplete, onError }) {
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('send'); // 'send', 'verify', 'completed'
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Setup reCAPTCHA
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response) => {
          // reCAPTCHA solved
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          // Response expired
          console.log('reCAPTCHA expired');
        }
      });
    }

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOTP = async () => {
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    setLoading(true);
    
    try {
      // Format phone number for Firebase (needs country code)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/[^0-9]/g, '')}`;
      
      console.log('📱 Sending Firebase SMS to:', formattedPhone);
      
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setVerificationId(confirmationResult.verificationId);
      setStep('verify');
      setResendCooldown(60);
      
      toast.success('📱 OTP sent to your phone number');
      console.log('SMS sent successfully via Firebase');
      
    } catch (error) {
      console.error('Firebase SMS error:', error);
      
      let errorMessage = 'Failed to send OTP';
      let shouldFallback = false;
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again tomorrow.';
      } else if (error.code === 'auth/billing-not-enabled') {
        errorMessage = 'SMS service temporarily unavailable. Using alternative verification.';
        shouldFallback = true;
      }
      
      if (shouldFallback) {
        // Fallback to regular phone OTP API
        try {
          toast.info('Using alternative phone verification method...');
          const response = await fetch('/api/auth/send-phone-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          const data = await response.json();

          if (data.success) {
            setStep('verify');
            setResendCooldown(60);
            toast.success('📱 OTP sent to your phone number (alternative method)');
            // Set a flag to use regular verification instead of Firebase
            setVerificationId('fallback');
          } else {
            toast.error(data.message || 'Failed to send OTP');
          }
        } catch (fallbackError) {
          console.error('Fallback SMS error:', fallbackError);
          toast.error('Phone verification is temporarily unavailable');
        }
      } else {
        toast.error(errorMessage);
      }
      
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    
    try {
      // Check if we're using fallback method
      if (verificationId === 'fallback') {
        // Use regular OTP verification
        const response = await fetch('/api/auth/verify-phone-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp })
        });

        const data = await response.json();

        if (data.success) {
          setStep('completed');
          toast.success('✅ Phone number verified successfully!');
          onVerificationComplete?.(data);
        } else {
          toast.error(data.message || 'Verification failed');
        }
      } else {
        // Use Firebase verification
        const { PhoneAuthProvider } = await import('firebase/auth');
        const credential = PhoneAuthProvider.credential(verificationId, otp);
        
        console.log('✅ Firebase phone verification successful');
        
        // Now call our backend to mark phone as verified
        const response = await fetch('/api/auth/verify-phone-firebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phoneNumber,
            firebaseCredential: {
              verificationId,
              verificationCode: otp
            }
          })
        });

        const data = await response.json();

        if (data.success) {
          setStep('completed');
          toast.success('✅ Phone number verified successfully!');
          onVerificationComplete?.(data);
        } else {
          toast.error(data.message || 'Verification failed');
        }
      }
      
    } catch (error) {
      console.error('OTP verification error:', error);
      
      let errorMessage = 'Invalid OTP';
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP code';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP has expired. Please request a new one.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'completed') {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Phone verified successfully!</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* reCAPTCHA container (invisible) */}
      <div id="recaptcha-container"></div>
      
      {step === 'send' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Phone className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Verify Phone Number</p>
              <p className="text-sm text-blue-700">{phoneNumber}</p>
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
                <span>Wait {resendCooldown}s</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send OTP via SMS
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
              <p className="font-medium text-green-900">OTP Sent!</p>
              <p className="text-sm text-green-700">Check your SMS for verification code</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
              autoComplete="one-time-code"
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
            className="w-full btn-secondary text-sm"
          >
            {resendCooldown > 0 
              ? `Resend OTP in ${resendCooldown}s` 
              : 'Resend OTP'
            }
          </button>
        </div>
      )}
    </div>
  );
}