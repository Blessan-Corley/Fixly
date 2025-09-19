// app/auth/verify-account/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  CheckCircle, 
  Send, 
  Loader, 
  Shield,
  ArrowRight,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import FirebasePhoneAuth from '@/components/auth/FirebasePhoneAuth';

export default function VerifyAccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailStep, setEmailStep] = useState('send'); // 'send', 'verify', 'verified'
  const [phoneStep, setPhoneStep] = useState('send'); // 'send', 'verify', 'verified'
  const [emailOTP, setEmailOTP] = useState('');
  const [phoneOTP, setPhoneOTP] = useState('');
  const [resendCooldown, setResendCooldown] = useState({ email: 0, phone: 0 });
  // Removed verification method selection - now using OTP only
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Set initial steps based on verification status
    if (session.user.emailVerified) {
      setEmailStep('verified');
    }
    if (session.user.phoneVerified) {
      setPhoneStep('verified');
    }

    // If both are verified, show success message but don't redirect
    if (session.user.emailVerified && session.user.phoneVerified) {
      // User is already verified, show success state
    }
  }, [session, status, router]);

  // Cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldown(prev => ({
        email: Math.max(0, prev.email - 1),
        phone: Math.max(0, prev.phone - 1)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendEmailVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          type: 'email_verification'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setEmailStep('verify');
        setResendCooldown(prev => ({ ...prev, email: 60 }));
      } else {
        // Handle Google authentication case
        if (data.message.includes('Google authentication') || data.message.includes('already verified')) {
          setEmailStep('verified');
          // Update session to reflect verification
          await update({
            ...session,
            user: {
              ...session.user,
              emailVerified: true,
              isVerified: session.user.phoneVerified || false
            }
          });
          toast.info(data.message);
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error('Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOTP = async () => {
    if (!emailOTP || emailOTP.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          otp: emailOTP,
          type: 'email_verification'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Email verified successfully!');
        setEmailStep('verified');
        setEmailOTP('');
        
        // Update session
        await update({
          ...session,
          user: {
            ...session.user,
            emailVerified: true,
            isVerified: data.user.isVerified
          }
        });

        // Check if fully verified
        if (data.user.isVerified) {
          toast.success('🎉 Account fully verified!');
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  // Phone verification is now handled by FirebasePhoneAuth component

  const updatePhoneNumber = async () => {
    if (!newPhoneNumber || newPhoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/update-phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhoneNumber })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Phone number updated successfully!');
        // Update session
        await update({
          ...session,
          user: {
            ...session.user,
            phone: data.user.phone,
            phoneVerified: false
          }
        });
        setShowPhoneEdit(false);
        setNewPhoneNumber('');
        setPhoneStep('send');
      } else {
        toast.error(data.message || 'Failed to update phone number');
      }
    } catch (error) {
      toast.error('Failed to update phone number');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  const isFullyVerified = emailStep === 'verified' && phoneStep === 'verified';

  return (
    <div className="min-h-screen bg-gradient-to-br from-fixly-accent/5 to-fixly-accent/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-fixly-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-fixly-accent" />
            </div>
            <h1 className="text-2xl font-bold text-fixly-text mb-2">
              Verify Your Account
            </h1>
            <p className="text-fixly-text-light">
              Secure your account by verifying your email and phone number
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-fixly-text-muted mb-2">
              <span>Progress</span>
              <span>
                {(emailStep === 'verified' ? 1 : 0) + (phoneStep === 'verified' ? 1 : 0)}/2
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-fixly-accent h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${((emailStep === 'verified' ? 1 : 0) + (phoneStep === 'verified' ? 1 : 0)) * 50}%` 
                }}
              />
            </div>
          </div>

          {/* Email Verification */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                emailStep === 'verified' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {emailStep === 'verified' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-fixly-text">Email Verification</h3>
                <p className="text-sm text-fixly-text-light">
                  {session?.user?.email}
                </p>
              </div>
            </div>

            {emailStep === 'send' && (
              <button
                onClick={sendEmailVerification}
                disabled={loading || resendCooldown.email > 0}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : resendCooldown.email > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    Wait {resendCooldown.email}s
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email OTP
                  </>
                )}
              </button>
            )}

            {emailStep === 'verify' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Enter 6-digit code
                  </label>
                  <input
                    type="text"
                    value={emailOTP}
                    onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-fixly-border rounded-lg text-center text-lg font-mono tracking-wider"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={verifyEmailOTP}
                  disabled={loading || emailOTP.length !== 6}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Verify Email
                    </>
                  )}
                </button>
                <button
                  onClick={sendEmailVerification}
                  disabled={loading || resendCooldown.email > 0}
                  className="w-full btn-secondary text-sm"
                >
                  {resendCooldown.email > 0 
                    ? `Resend in ${resendCooldown.email}s` 
                    : 'Resend Code'
                  }
                </button>
              </div>
            )}

            {emailStep === 'verified' && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Email verified successfully!</span>
              </div>
            )}
          </div>

          {/* Phone Verification */}
          {session?.user?.phone && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  phoneStep === 'verified' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {phoneStep === 'verified' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Phone className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-fixly-text">Phone Verification</h3>
                  <p className="text-sm text-fixly-text-light">
                    {session?.user?.phone}
                  </p>
                </div>
                {phoneStep !== 'verified' && (
                  <button
                    onClick={() => setShowPhoneEdit(true)}
                    className="text-xs text-fixly-accent hover:text-fixly-accent-dark underline"
                  >
                    This isn't your number?
                  </button>
                )}
              </div>

              {phoneStep === 'verified' && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Phone verified successfully!</span>
                </div>
              )}

              {showPhoneEdit ? (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-fixly-text">Update Phone Number</h4>
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      New Phone Number
                    </label>
                    <input
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter your new phone number"
                      className="w-full px-4 py-3 border border-fixly-border rounded-lg focus:ring-2 focus:ring-fixly-accent focus:border-fixly-accent"
                      maxLength={10}
                    />
                    <p className="text-xs text-fixly-text-muted mt-1">
                      Enter 10-digit mobile number without country code
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={updatePhoneNumber}
                      disabled={loading || !newPhoneNumber || newPhoneNumber.length < 10}
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        'Update Number'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowPhoneEdit(false);
                        setNewPhoneNumber('');
                      }}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : phoneStep !== 'verified' && (
                <FirebasePhoneAuth
                  phoneNumber={session?.user?.phone}
                  onVerificationComplete={(data) => {
                    setPhoneStep('verified');
                    // Update session
                    update({
                      ...session,
                      user: {
                        ...session.user,
                        phoneVerified: true,
                        isVerified: data.user.isVerified
                      }
                    });

                    // Check if fully verified
                    if (data.user.isVerified) {
                      toast.success('🎉 Account fully verified!');
                      setTimeout(() => router.push('/dashboard'), 2000);
                    }
                  }}
                  onError={(error) => {
                    console.error('Phone verification error:', error);
                  }}
                />
              )}
            </div>
          )}

          {/* Continue Button */}
          {isFullyVerified && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Account Fully Verified!</span>
                </div>
                <p className="text-sm text-green-700">
                  Your account is now secure and ready to use all features.
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* Skip Option */}
          {!isFullyVerified && (
            <div className="text-center pt-4 border-t border-fixly-border">
              <p className="text-sm text-fixly-text-muted mb-2">
                Want to verify later?
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-fixly-accent hover:text-fixly-accent-dark text-sm font-medium"
              >
                Skip for now
              </button>
              <div className="flex items-center gap-1 justify-center mt-2 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />
                <span>Some features may be limited</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}