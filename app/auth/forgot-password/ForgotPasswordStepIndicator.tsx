'use client';

import { CheckCircle } from 'lucide-react';

import type { RecoveryStep } from './forgot-password.types';

type ForgotPasswordStepIndicatorProps = {
  step: RecoveryStep;
};

export default function ForgotPasswordStepIndicator({
  step,
}: ForgotPasswordStepIndicatorProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      {([1, 2, 3] as RecoveryStep[]).map((stepNumber) => (
        <div key={stepNumber} className="flex flex-1 items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
              step >= stepNumber
                ? 'bg-fixly-accent text-fixly-text'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {step > stepNumber ? <CheckCircle className="h-4 w-4" /> : stepNumber}
          </div>
          {stepNumber < 3 ? (
            <div
              className={`h-1 flex-1 rounded-full ${
                step > stepNumber ? 'bg-fixly-accent' : 'bg-gray-200 dark:bg-gray-800'
              }`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
