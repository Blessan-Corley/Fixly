'use client';

import { motion } from 'framer-motion';
import { Loader, Lock } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import type { PasswordStrength } from './forgot-password.types';

type ForgotPasswordStepResetProps = {
  newPassword: string;
  confirmPassword: string;
  strength: PasswordStrength;
  showPassword: boolean;
  showConfirmPassword: boolean;
  loading: boolean;
  newPasswordRegistration: UseFormRegisterReturn;
  confirmPasswordRegistration: UseFormRegisterReturn;
  onReset: () => Promise<void>;
  onClearError: () => void;
  onToggleShowPassword: () => void;
  onToggleShowConfirmPassword: () => void;
};

export default function ForgotPasswordStepReset({
  newPassword,
  confirmPassword,
  strength,
  showPassword,
  showConfirmPassword,
  loading,
  newPasswordRegistration,
  confirmPasswordRegistration,
  onReset,
  onClearError,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
}: ForgotPasswordStepResetProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200">
        Your email has been verified. Set your new password below.
      </div>

      <div>
        <label
          htmlFor="forgot-password-new-password"
          className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100"
        >
          New password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
          <input
            id="forgot-password-new-password"
            type={showPassword ? 'text' : 'password'}
            {...newPasswordRegistration}
            onChange={(event) => {
              newPasswordRegistration.onChange(event);
              onClearError();
            }}
            placeholder="Create a new password"
            autoComplete="new-password"
            className="input-field pl-10 pr-16 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fixly-text-muted"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="forgot-password-confirm-password"
          className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100"
        >
          Confirm password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
          <input
            id="forgot-password-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            {...confirmPasswordRegistration}
            onChange={(event) => {
              confirmPasswordRegistration.onChange(event);
              onClearError();
            }}
            placeholder="Confirm your password"
            autoComplete="new-password"
            className="input-field pl-10 pr-16 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={onToggleShowConfirmPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fixly-text-muted"
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {newPassword ? (
        <div className="rounded-2xl border border-fixly-border px-4 py-3 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fixly-text-light dark:text-gray-300">Password strength</span>
            <span
              className={
                strength.color === 'red'
                  ? 'text-red-500'
                  : strength.color === 'yellow'
                    ? 'text-yellow-500'
                    : 'text-green-500'
              }
            >
              {strength.text}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className={`h-2 rounded-full ${
                strength.color === 'red'
                  ? 'bg-red-500'
                  : strength.color === 'yellow'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${(strength.level / 4) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void onReset()}
        disabled={loading || !newPassword || !confirmPassword}
        className="btn-primary w-full rounded-2xl py-3"
      >
        {loading ? <Loader className="mr-2 inline h-5 w-5 animate-spin" /> : null}
        Reset password
      </button>
    </motion.div>
  );
}
