'use client';

type UserPlan = {
  type?: string;
  status?: string;
  creditsUsed?: number;
} | null | undefined;

type Props = {
  plan: UserPlan;
  onUpgrade: () => void;
};

export function JobCreditsCard({ plan, onUpgrade }: Props): React.JSX.Element {
  const isPro = plan?.type === 'pro' && plan?.status === 'active';
  const creditsUsed = plan?.creditsUsed ?? 0;
  const creditsLeft = Math.max(0, 3 - creditsUsed);
  const isExhausted = creditsUsed >= 3;

  if (isPro) {
    return (
      <div className="card">
        <h3 className="mb-4 font-semibold text-fixly-text">Your Credits</h3>
        <div className="text-center">
          <div className="mb-2 text-2xl font-bold text-green-600">Unlimited</div>
          <p className="text-sm text-fixly-text">Unlimited Applications</p>
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2">
            <p className="text-xs text-green-800">Pro Member</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="mb-4 font-semibold text-fixly-text">Your Credits</h3>
      <div className="text-center">
        <div className="mb-2 text-3xl font-bold text-fixly-accent">{creditsLeft}</div>
        <p className="text-sm text-fixly-text-muted">Free Applications Left</p>

        {isExhausted ? (
          <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
            <p className="mb-2 text-xs text-orange-800">No credits left</p>
            <button type="button" onClick={onUpgrade} className="btn-primary w-full text-xs">
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-2">
            <p className="text-xs text-blue-800">Used {creditsUsed} of 3 free applications</p>
            <p className="mt-1 text-xs text-blue-600">
              Credits are deducted only when jobs are assigned to you
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
