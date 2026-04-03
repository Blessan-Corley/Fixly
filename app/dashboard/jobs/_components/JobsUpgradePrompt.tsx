'use client';

import { TrendingUp } from 'lucide-react';

export function JobsUpgradePrompt({
  onUpgrade,
}: {
  onUpgrade: () => void;
}): React.JSX.Element {
  return (
    <div className="card fixed bottom-6 right-6 max-w-sm border-fixly-accent shadow-fixly-lg">
      <div className="flex items-start">
        <TrendingUp className="mr-3 mt-1 h-6 w-6 text-fixly-accent" />
        <div className="flex-1">
          <h4 className="mb-1 font-semibold text-fixly-text">Upgrade to Pro</h4>
          <p className="mb-3 text-sm text-fixly-text-muted">
            You've posted multiple jobs. Upgrade for unlimited posting and priority support.
          </p>
          <button onClick={onUpgrade} className="btn-primary w-full text-sm">
            Upgrade Now - Rs. 199/month
          </button>
        </div>
      </div>
    </div>
  );
}
