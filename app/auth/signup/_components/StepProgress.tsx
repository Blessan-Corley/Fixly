'use client';

import { Check } from 'lucide-react';

import type { SignupStep } from '../_lib/signup.types';

type StepProgressProps = {
  steps: SignupStep[];
  currentStep: SignupStep;
  completedSteps: SignupStep[];
};

const STEP_LABELS: Record<SignupStep, string> = {
  role: 'Role',
  account: 'Account',
  verification: 'Verify',
  profile: 'Profile',
};

export function StepProgress({
  steps,
  currentStep,
  completedSteps,
}: StepProgressProps): React.JSX.Element {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-between gap-2">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step);
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isCompleted || isActive
                  ? 'bg-fixly-accent text-fixly-text'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
              title={STEP_LABELS[step]}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`h-1 flex-1 rounded-full ${
                  index < currentIndex ? 'bg-fixly-accent' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
