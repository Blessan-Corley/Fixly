'use client';

import { motion } from 'framer-motion';
import { Loader, Mail } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

type ForgotPasswordStepEmailProps = {
  emailRegistration: UseFormRegisterReturn;
  email: string;
  loading: boolean;
  onSend: () => Promise<void>;
  onClearError: () => void;
};

export default function ForgotPasswordStepEmail({
  emailRegistration,
  email,
  loading,
  onSend,
  onClearError,
}: ForgotPasswordStepEmailProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="forgot-password-email"
          className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
          <input
            id="forgot-password-email"
            type="email"
            {...emailRegistration}
            onChange={(event) => {
              emailRegistration.onChange(event);
              onClearError();
            }}
            placeholder="Enter your Fixly email"
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            spellCheck={false}
            className="input-field pl-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onSend()}
        disabled={loading || !email.trim()}
        className="btn-primary w-full rounded-2xl py-3"
      >
        {loading ? <Loader className="mr-2 inline h-5 w-5 animate-spin" /> : null}
        Send reset code
      </button>
    </motion.div>
  );
}
