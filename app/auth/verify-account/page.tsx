'use client';

import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Loader, Shield } from 'lucide-react';

import AuthShell from '@/components/auth/AuthShell';

import { useVerifyAccount } from './useVerifyAccount';
import { VerifyEmailSection } from './VerifyEmailSection';
import { VerifyPhoneSection } from './VerifyPhoneSection';

export default function VerifyAccountPage(): JSX.Element {
  const {
    loading,
    emailStep,
    phoneStep,
    emailOTP,
    resendCooldown,
    showPhoneEdit,
    newPhoneNumber,
    isFullyVerified,
    sessionStatus,
    sessionUser,
    setEmailOTP,
    setShowPhoneEdit,
    setNewPhoneNumber,
    sendEmailVerification,
    verifyEmailOTP,
    updatePhoneNumber,
    handlePhoneVerificationComplete,
    goToDashboard,
  } = useVerifyAccount();

  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  const verifiedCount = (emailStep === 'verified' ? 1 : 0) + (phoneStep === 'verified' ? 1 : 0);

  return (
    <AuthShell
      title="Verify Your Account"
      subtitle="Confirm your email and phone details"
      badge="Account Security"
      footer={null}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
            <Shield className="h-8 w-8 text-fixly-accent" />
          </div>
          <p className="text-fixly-text-light dark:text-slate-400">
            Finish verification to unlock your account fully
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-fixly-text-muted dark:text-slate-400">
            <span>Progress</span>
            <span>{verifiedCount}/2</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
            <div
              className="h-2 rounded-full bg-fixly-accent transition-all duration-500"
              style={{ width: `${verifiedCount * 50}%` }}
            />
          </div>
        </div>

        <VerifyEmailSection
          email={sessionUser?.email}
          emailStep={emailStep}
          emailOTP={emailOTP}
          loading={loading}
          cooldown={resendCooldown.email}
          onSend={() => void sendEmailVerification()}
          onVerify={() => void verifyEmailOTP()}
          onOtpChange={setEmailOTP}
        />

        <VerifyPhoneSection
          phone={sessionUser?.phone}
          phoneStep={phoneStep}
          loading={loading}
          showPhoneEdit={showPhoneEdit}
          newPhoneNumber={newPhoneNumber}
          onVerificationComplete={handlePhoneVerificationComplete}
          onUpdatePhone={() => void updatePhoneNumber()}
          onToggleEdit={setShowPhoneEdit}
          onNewPhoneChange={setNewPhoneNumber}
        />

        {isFullyVerified ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
              <div className="mb-2 flex items-center justify-center gap-2 text-green-600 dark:text-green-300">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Account Fully Verified!</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-200">
                Your account is now secure and ready to use all features.
              </p>
            </div>
            <button
              onClick={goToDashboard}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <div className="border-t border-fixly-border pt-4 text-center dark:border-slate-800">
            <p className="mb-2 text-sm text-fixly-text-muted dark:text-slate-400">Want to verify later?</p>
            <button
              onClick={goToDashboard}
              className="text-sm font-medium text-fixly-accent hover:text-fixly-accent-dark"
            >
              Skip for now
            </button>
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>Some features may be limited</span>
            </div>
          </div>
        )}
      </motion.div>
    </AuthShell>
  );
}
