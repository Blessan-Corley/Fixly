'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

import AuthShell from '@/components/auth/AuthShell';
import type { AuthMethod } from '@/types/User';

import { AccountStep } from './_components/AccountStep';
import { ProfileStep } from './_components/ProfileStep';
import { RoleStep } from './_components/RoleStep';
import { StepProgress } from './_components/StepProgress';
import { VerificationStep } from './_components/VerificationStep';
import { useSignupPage } from './_hooks/useSignupPage';

function SignupPageContent() {
  const router = useRouter();
  const {
    formData,
    currentStep,
    errors,
    isLoading,
    completedSteps,
    visibleSteps,
    otp,
    canContinue,
    handleChange,
    handleContinue,
    goBack,
    selectedRole,
  } = useSignupPage();

  const roleLabel =
    formData.role === 'fixer' ? 'Fixer' : formData.role === 'hirer' ? 'Hirer' : '';

  const stepContent =
    currentStep === 'role' ? (
      <RoleStep
        role={formData.role}
        authMethod={formData.authMethod}
        error={errors.role}
        authMethodError={errors.authMethod}
        isLoading={isLoading}
        onSelect={(role) => handleChange('role', role)}
        onAuthMethodSelect={(method) => handleChange('authMethod', method as AuthMethod)}
      />
    ) : currentStep === 'account' ? (
      <AccountStep
        formData={formData}
        errors={errors}
        isLoading={isLoading}
        otpLoading={otp.otpLoading}
        emailOtp={otp.emailOtp}
        emailOtpSent={otp.emailOtpSent}
        emailOtpVerified={otp.emailOtpVerified}
        otpError={otp.otpError}
        resendCooldown={otp.resendCooldown}
        canSendEmailOtp={otp.canSendEmailOtp}
        onChange={handleChange}
        onEmailOtpChange={otp.setEmailOtp}
        onSendEmailOtp={otp.sendEmailOtp}
        onVerifyEmailOtp={otp.verifyEmailOtp}
      />
    ) : currentStep === 'profile' ? (
      <ProfileStep
        formData={formData}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
      />
    ) : (
      <VerificationStep
        formData={formData}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
      />
    );

  return (
    <AuthShell
      title={roleLabel ? `Welcome ${roleLabel}` : 'Welcome to Fixly'}
      subtitle="Create your account"
      badge={roleLabel ? `${roleLabel} Signup` : 'Create Account'}
      footer={
        <p>
          Already a Fixly user?{' '}
          <button
            type="button"
            onClick={() => router.push(`/auth/signin?role=${formData.role ?? 'fixer'}`)}
            className="font-semibold text-fixly-accent transition-colors hover:text-fixly-accent-dark"
          >
            Sign in instead
          </button>
        </p>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleContinue();
        }}
        className="space-y-6"
      >
        <StepProgress
          steps={visibleSteps}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {stepContent}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          {currentStep !== 'role' ? (
            <button
              type="button"
              onClick={goBack}
              className="btn-ghost rounded-2xl px-5 py-3"
              disabled={isLoading}
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={isLoading || !canContinue}
            className="btn-primary rounded-2xl px-5 py-3"
          >
            {isLoading ? <Loader className="mr-2 inline h-4 w-4 animate-spin" /> : null}
            {currentStep === 'verification' ? 'Create account' : 'Continue'}
            {currentStep !== 'verification' && <ArrowRight className="ml-2 inline h-4 w-4" />}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageContent />
    </Suspense>
  );
}
