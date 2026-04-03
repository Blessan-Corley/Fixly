'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

type DashboardUpgradeNoticeProps = {
  creditsUsed: number;
};

export function DashboardUpgradeNotice({
  creditsUsed,
}: DashboardUpgradeNoticeProps): React.JSX.Element | null {
  const router = useRouter();

  if (creditsUsed < 3) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4"
    >
      <div className="flex items-center">
        <AlertCircle className="mr-3 h-5 w-5 text-orange-600" />
        <div className="flex-1">
          <div className="font-medium text-orange-800">Upgrade Required</div>
          <div className="text-sm text-orange-700">
            You&apos;ve used all 3 free job applications. Upgrade to Pro for unlimited access.
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/subscription')}
          className="btn-primary ml-4"
        >
          Upgrade Now
        </button>
      </div>
    </motion.div>
  );
}
