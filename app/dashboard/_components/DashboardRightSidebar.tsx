'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import type { DashboardUser, NextStep } from '../_lib/dashboard.types';

type DashboardRightSidebarProps = {
  user: DashboardUser | null;
  nextStep: NextStep;
  creditsUsed: number;
};

export function DashboardRightSidebar({
  user,
  nextStep,
  creditsUsed,
}: DashboardRightSidebarProps): React.JSX.Element {
  const router = useRouter();
  const NextStepIcon = nextStep?.icon ?? null;

  return (
    <div className="space-y-6">
      {nextStep && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="text-center">
            <div className="mx-auto mb-4 w-fit rounded-lg bg-fixly-accent/10 p-3">
              {NextStepIcon && <NextStepIcon className="h-8 w-8 text-fixly-accent" />}
            </div>
            <h3 className="mb-2 font-semibold text-fixly-text">{nextStep.title}</h3>
            <p className="mb-4 text-sm text-fixly-text-muted">{nextStep.description}</p>
            <button
              onClick={() => router.push(nextStep.href)}
              className="btn-primary w-full"
            >
              {nextStep.action}
            </button>
          </div>
        </motion.div>
      )}

      {user?.role === 'fixer' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h3 className="mb-4 font-semibold text-fixly-text">Your Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-fixly-text-muted">Free Credits Used</span>
                <span className="text-fixly-text">{creditsUsed}/3</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, (creditsUsed / 3) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-fixly-text-muted">Profile Completion</span>
                <span className="text-fixly-text">85%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="mb-4 font-semibold text-fixly-text">
          {user?.role === 'hirer' ? 'Hiring Tips' : 'Success Tips'}
        </h3>
        <div className="space-y-3 text-sm">
          {user?.role === 'hirer' ? (
            <>
              <TipItem text="Include clear photos and detailed descriptions in your job posts" />
              <TipItem text="Set realistic budgets to attract quality fixers" />
              <TipItem text="Communicate clearly with applicants before hiring" />
            </>
          ) : (
            <>
              <TipItem text="Complete your profile to build trust with hirers" />
              <TipItem text="Apply quickly to new job postings" />
              <TipItem text="Provide competitive quotes with clear timelines" />
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TipItem({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="flex items-start">
      <div className="mr-3 mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-fixly-accent"></div>
      <div className="text-fixly-text-muted">{text}</div>
    </div>
  );
}
