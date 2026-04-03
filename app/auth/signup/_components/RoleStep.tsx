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
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-fixly-text dark:text-white">
          Choose your role and sign up method
        </h2>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onSelect('hirer')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              role === 'hirer'
                ? 'border-fixly-accent bg-fixly-accent/10'
                : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className="font-semibold text-fixly-text dark:text-white">Join as Hirer</div>
            <div className="mt-1 text-sm text-fixly-text-light dark:text-gray-300">
              Post jobs and hire trusted fixers
            </div>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onSelect('fixer')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              role === 'fixer'
                ? 'border-fixly-accent bg-fixly-accent/10'
                : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className="font-semibold text-fixly-text dark:text-white">Join as Fixer</div>
            <div className="mt-1 text-sm text-fixly-text-light dark:text-gray-300">
              Show your skills and get hired faster
            </div>
          </button>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => onAuthMethodSelect('google')}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            authMethod === 'google'
              ? 'border-fixly-accent bg-fixly-accent/10'
              : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <div className="font-semibold text-fixly-text dark:text-white">
              Continue with Google
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => onAuthMethodSelect('email')}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            authMethod === 'email'
              ? 'border-fixly-accent bg-fixly-accent/10'
              : 'border-fixly-border bg-white hover:border-fixly-accent/60 dark:border-gray-700 dark:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-fixly-accent" />
            <div className="font-semibold text-fixly-text dark:text-white">
              Continue with Email
            </div>
          </div>
        </button>
      </div>

      {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
      {authMethodError ? <p className="text-center text-sm text-red-500">{authMethodError}</p> : null}
    </div>
  );
}
