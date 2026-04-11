'use client';

import { Mail } from 'lucide-react';

import type { AuthMethod, UserRole } from '@/types/User';

type RoleStepProps = {
  role?: UserRole;
  authMethod: AuthMethod | '';
  error?: string;
  authMethodError?: string;
  isLoading: boolean;
  onSelect: (role: UserRole) => void;
  onAuthMethodSelect: (method: 'email' | 'google') => void;
};

export function RoleStep({
  role,
  authMethod,
  error,
  authMethodError,
  isLoading,
  onSelect,
  onAuthMethodSelect,
}: RoleStepProps): React.JSX.Element {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-fixly-text dark:text-white">
          Get started on Fixly
        </h2>
        <p className="mt-1 text-sm text-fixly-text-light dark:text-gray-400">
          Tell us who you are and how you'd like to join
        </p>
      </div>

      {/* Step 1: Role selection */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-fixly-text-muted dark:text-gray-400">
          I want to…
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onSelect('hirer')}
            aria-pressed={role === 'hirer'}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              role === 'hirer'
                ? 'border-fixly-accent bg-fixly-accent/10 ring-1 ring-fixly-accent/30'
                : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className="font-semibold text-fixly-text dark:text-white">Hire a Fixer</div>
            <div className="mt-1 text-sm text-fixly-text-light dark:text-gray-300">
              Post jobs, get quotes, hire locally
            </div>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onSelect('fixer')}
            aria-pressed={role === 'fixer'}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              role === 'fixer'
                ? 'border-fixly-accent bg-fixly-accent/10 ring-1 ring-fixly-accent/30'
                : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className="font-semibold text-fixly-text dark:text-white">Offer Services</div>
            <div className="mt-1 text-sm text-fixly-text-light dark:text-gray-300">
              Showcase skills and get hired
            </div>
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
      </div>

      {/* Step 2: Auth method */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-fixly-border dark:bg-gray-700" />
          <p className="text-xs font-semibold uppercase tracking-widest text-fixly-text-muted dark:text-gray-400">
            Sign up with
          </p>
          <div className="h-px flex-1 bg-fixly-border dark:bg-gray-700" />
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAuthMethodSelect('google')}
            aria-pressed={authMethod === 'google'}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
              authMethod === 'google'
                ? 'border-fixly-accent bg-fixly-accent/10 ring-1 ring-fixly-accent/30'
                : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="font-medium text-fixly-text dark:text-white">Continue with Google</span>
            <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Recommended
            </span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAuthMethodSelect('email')}
            aria-pressed={authMethod === 'email'}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
              authMethod === 'email'
                ? 'border-fixly-accent bg-fixly-accent/10 ring-1 ring-fixly-accent/30'
                : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <Mail className="h-5 w-5 shrink-0 text-fixly-accent" />
            <span className="font-medium text-fixly-text dark:text-white">Continue with Email</span>
          </button>
        </div>
        {authMethodError ? <p className="mt-2 text-sm text-red-500">{authMethodError}</p> : null}
      </div>
    </div>
  );
}
