'use client';

import { Eye, EyeOff, Loader, Lock, UserCircle2 } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';

import type { SignInFormData } from './_hooks/useSignInPage';

type SignInFormErrors = {
  identifier?: { message?: string };
  password?: { message?: string };
};

type SignInFormContentProps = {
  register: UseFormRegister<SignInFormData>;
  errors: SignInFormErrors;
  loading: boolean;
  googleLoading: boolean;
  showPassword: boolean;
  setShowPassword: (fn: (prev: boolean) => boolean) => void;
  handleEmailSignIn: (e?: React.BaseSyntheticEvent) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  onForgotPassword: () => void;
};

export default function SignInFormContent({
  register,
  errors,
  loading,
  googleLoading,
  showPassword,
  setShowPassword,
  handleEmailSignIn,
  handleGoogleSignIn,
  onForgotPassword,
}: SignInFormContentProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-fixly-border bg-white px-4 py-4 font-semibold text-fixly-text transition hover:border-fixly-accent hover:bg-fixly-accent/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-800"
      >
        {googleLoading ? (
          <Loader className="h-5 w-5 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-fixly-border dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.22em] text-fixly-text-muted dark:text-gray-400">
          <span className="bg-white px-3 dark:bg-gray-900">Or use your password</span>
        </div>
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label
            htmlFor="signin-identifier"
            className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100"
          >
            Email or Username
          </label>
          <div className="relative">
            <UserCircle2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
            <input
              id="signin-identifier"
              type="text"
              {...register('identifier')}
              placeholder="Enter your email or username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="input-field pl-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              disabled={loading || googleLoading}
            />
          </div>
          {errors.identifier?.message ? (
            <p className="mt-1 text-sm text-red-500">{errors.identifier.message}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="signin-password"
            className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="input-field pl-10 pr-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              disabled={loading || googleLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fixly-text-muted"
              disabled={loading || googleLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password?.message ? (
            <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="btn-primary w-full rounded-2xl py-3"
        >
          {loading ? <Loader className="mr-2 inline h-5 w-5 animate-spin" /> : null}
          Sign In
        </button>
      </form>

      <div className="rounded-2xl border border-fixly-border bg-fixly-bg/60 px-4 py-3 text-sm text-fixly-text-light dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
        Use Google if you originally joined with Google. If you started creating an account but
        didn&apos;t finish, continue signup instead.
      </div>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onForgotPassword}
          className="font-medium text-fixly-accent transition-colors hover:text-fixly-accent-dark"
        >
          Forgot your password?
        </button>
      </div>
    </div>
  );
}
