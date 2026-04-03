'use client';

import { motion } from 'framer-motion';

import AuthShell from '@/components/auth/AuthShell';

import { useSignInPage } from './_hooks/useSignInPage';
import SignInFormContent from './SignInFormContent';

export default function SignInPage(): React.JSX.Element {
  const {
    error,
    role,
    register,
    errors,
    loading,
    googleLoading,
    showPassword,
    setShowPassword,
    handleEmailSignIn,
    handleGoogleSignIn,
    router,
  } = useSignInPage();

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your account"
      badge="Sign In"
      footer={
        <p>
          Need a Fixly account?{' '}
          <button
            onClick={() => router.push(`/auth/signup?role=${role}`)}
            className="font-semibold text-fixly-accent transition-colors hover:text-fixly-accent-dark"
            disabled={loading || googleLoading}
          >
            Create a new account
          </button>
        </p>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SignInFormContent
          register={register}
          errors={errors}
          loading={loading}
          googleLoading={googleLoading}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          handleEmailSignIn={handleEmailSignIn}
          handleGoogleSignIn={handleGoogleSignIn}
          onForgotPassword={() => router.push('/auth/forgot-password')}
        />
      </motion.div>
    </AuthShell>
  );
}
