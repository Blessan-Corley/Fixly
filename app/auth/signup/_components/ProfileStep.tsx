'use client';

import { Phone, UserCircle2 } from 'lucide-react';

import type { SignupErrors, SignupFormData } from '../_lib/signup.types';

type ProfileStepProps = {
  formData: SignupFormData;
  errors: SignupErrors;
  isLoading: boolean;
  onChange: <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => void;
};

export function ProfileStep({
  formData,
  errors,
  isLoading,
  onChange,
}: ProfileStepProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-fixly-text dark:text-white">Profile details</h2>
      </div>

      <div>
        <label htmlFor="signup-name" className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100">
          Full name
        </label>
        <div className="relative">
          <UserCircle2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
          <input
            id="signup-name"
            type="text"
            value={formData.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
            disabled={isLoading}
            className="input-field pl-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name}</p> : null}
      </div>

      <div>
        <label htmlFor="signup-username" className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100">
          Username
        </label>
        <input
          id="signup-username"
          type="text"
          value={formData.username}
          onChange={(event) =>
            onChange('username', event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
          }
          placeholder="Choose a unique username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={isLoading}
          className="input-field dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        {errors.username ? <p className="mt-1 text-sm text-red-500">{errors.username}</p> : null}
      </div>

      <div>
        <label htmlFor="signup-phone" className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100">
          Phone number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
          <input
            id="signup-phone"
            type="tel"
            value={formData.phone}
            onChange={(event) => onChange('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit Indian mobile number"
            autoComplete="tel"
            inputMode="numeric"
            disabled={isLoading}
            className="input-field pl-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        {errors.phone ? <p className="mt-1 text-sm text-red-500">{errors.phone}</p> : null}
      </div>
    </div>
  );
}
