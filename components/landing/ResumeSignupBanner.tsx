'use client';

import { RotateCcw, X } from 'lucide-react';

import type { IncompleteSignupNotice } from './landing.types';

type ResumeSignupBannerProps = {
  notice: IncompleteSignupNotice;
  isResetting: boolean;
  onContinue: () => void;
  onStartOver: () => void;
  onDismiss: () => void;
};

export default function ResumeSignupBanner({
  notice,
  isResetting,
  onContinue,
  onStartOver,
  onDismiss,
}: ResumeSignupBannerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))]">
      <div className="relative rounded-2xl border border-fixly-accent/20 bg-fixly-card p-4 shadow-fixly-lg backdrop-blur">
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-fixly-text-muted transition-colors duration-200 hover:bg-fixly-bg hover:text-fixly-text"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-fixly-accent/10 p-2 text-fixly-accent">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <p className="text-sm font-semibold text-fixly-text">
              There is an unfinished account setup waiting for you.
            </p>
            <p className="mt-1 text-sm text-fixly-text-light">
              {notice.hasPendingSession
                ? 'You are still signed in with an incomplete signup. Continue where you left off or start again from the beginning.'
                : 'We found a saved signup draft on this device. Continue where you left off or start again from the beginning.'}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onContinue}
                className="btn-primary w-full rounded-2xl px-4 py-2 text-sm sm:w-auto"
              >
                Continue creating account
              </button>
              <button
                type="button"
                onClick={onStartOver}
                disabled={isResetting}
                className="btn-ghost w-full rounded-2xl px-4 py-2 text-sm sm:w-auto"
              >
                Start over from the beginning
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
