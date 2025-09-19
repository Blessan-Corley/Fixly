'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail,
  ArrowLeft,
  Loader,
  CheckCircle,
  AlertCircle,
  Check,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Form states
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password validation
  const validatePassword = (password) => {
    if (!password || password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/\d/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one special character' };
    }
    return { valid: true };
  };

  // Send OTP for password reset
  const sendOTP = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          purpose: 'password_reset'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpSent(true);
        setStep(2);
        toast.success('Verification code sent to your email!');

        // Start cooldown timer
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        if (response.status === 429) {
          setError('Too many OTP requests. Please try again later.');
        } else {
          setError(data.message || 'Failed to send verification code. Please try again.');
        }
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          otp: otp,
          purpose: 'password_reset'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpVerified(true);
        setStep(3);
        setError('');
        toast.success('Email verified! Now create your new password.');
      } else {
        if (response.status === 429) {
          setError('Too many verification attempts. Please request a new code.');
        } else {
          setError(data.message || 'Invalid verification code. Please try again.');
        }
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    if (resendCooldown > 0) return;
    setOtp('');
    await sendOTP();
  };

  // Reset password
  const resetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          newPassword: newPassword,
          otp: otp // Include OTP for additional verification
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Password reset successfully! You can now sign in with your new password.');
        router.push('/auth/signin?message=password_reset_success');
      } else {
        setError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your email address"
                  className="input-field pl-10"
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="mt-2 flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            <button
              onClick={sendOTP}
              disabled={loading || !email}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 mr-2" />
              ) : (
                <Mail className="h-5 w-5 mr-2" />
              )}
              Send Verification Code
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="p-4 bg-fixly-accent/10 border border-fixly-accent/20 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="h-4 w-4 text-fixly-accent" />
                <span className="text-sm font-medium text-fixly-accent">
                  Verification code sent!
                </span>
              </div>
              <p className="text-sm text-fixly-text-light">
                We've sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    setError('');
                  }}
                  placeholder="Enter 6-digit code"
                  className={`input-field text-center text-lg tracking-widest ${
                    error ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="mt-2 flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={verifyOTP}
                disabled={otp.length !== 6 || loading}
                className="btn-primary flex items-center"
              >
                {loading ? (
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Verify Code
              </button>

              <button
                onClick={resendOTP}
                disabled={resendCooldown > 0 || loading}
                className="text-sm text-fixly-accent hover:text-fixly-accent-dark disabled:text-fixly-text-muted"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Code'
                }
              </button>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setOtpSent(false);
                setOtp('');
                setError('');
              }}
              className="btn-ghost w-full flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Use Different Email
            </button>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  Email verified successfully!
                </span>
              </div>
              <p className="text-sm text-green-700">
                Now create your new password for <strong>{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Create a new password"
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-fixly-text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-fixly-text-muted" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Confirm your new password"
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-fixly-text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-fixly-text-muted" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={resetPassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 mr-2" />
              ) : (
                <Lock className="h-5 w-5 mr-2" />
              )}
              Reset Password
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fixly-text mb-2">
            {step === 1 ? 'Reset Password' : step === 2 ? 'Verify Email' : 'New Password'}
          </h1>
          <p className="text-fixly-text-light">
            {step === 1
              ? 'Enter your email to receive a verification code'
              : step === 2
              ? 'Enter the verification code sent to your email'
              : 'Create a strong new password for your account'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {[1, 2, 3].map((stepNum) => (
              <div
                key={stepNum}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum
                    ? 'bg-fixly-accent text-fixly-text'
                    : 'bg-fixly-border text-fixly-text-muted'
                }`}
              >
                {step > stepNum ? <Check className="h-4 w-4" /> : stepNum}
              </div>
            ))}
          </div>
          <div className="h-2 bg-fixly-border rounded-full">
            <div
              className="h-full bg-fixly-accent rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          {renderStepContent()}

          {/* Back to Sign In */}
          {step === 1 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/auth/signin')}
                className="btn-ghost flex items-center mx-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </button>
            </div>
          )}
        </motion.div>

        {/* Additional Help */}
        {step === 1 && (
          <div className="text-center mt-6">
            <p className="text-sm text-fixly-text-light">
              Remember your password?{' '}
              <button
                onClick={() => router.push('/auth/signin')}
                className="text-fixly-accent hover:text-fixly-accent-dark font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}