'use client';

import { Award, Clock, Eye, Search, Star, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { EarningsState } from './earnings.types';
import { MONTHLY_GOAL } from './earnings.types';
import { formatCurrency, getUserPlanType, getUserRatingAverage } from './earnings.utils';

type EarningsSidebarProps = {
  earnings: EarningsState;
  user: unknown;
};

export default function EarningsSidebar({ earnings, user }: EarningsSidebarProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Star className="mr-2 h-4 w-4 text-yellow-500" />
              <span className="text-fixly-text-muted">Rating</span>
            </div>
            <span className="font-medium text-fixly-text">
              {getUserRatingAverage(user).toFixed(1)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-blue-500" />
              <span className="text-fixly-text-muted">Response Time</span>
            </div>
            <span className="font-medium text-fixly-text">{'< 2 hours'}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Award className="mr-2 h-4 w-4 text-fixly-primary" />
              <span className="text-fixly-text-muted">Success Rate</span>
            </div>
            <span className="font-medium text-fixly-text">
              {earnings.completedJobs > 0 ? '98%' : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard/browse-jobs')}
            className="btn-primary w-full justify-start"
          >
            <Search className="mr-2 h-4 w-4" />
            Find More Jobs
          </button>

          <button
            onClick={() => router.push('/dashboard/profile')}
            className="btn-secondary w-full justify-start"
          >
            <Eye className="mr-2 h-4 w-4" />
            Update Profile
          </button>

          {getUserPlanType(user) !== 'pro' && (
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="btn-ghost w-full justify-start border border-fixly-accent text-fixly-accent"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Monthly Goal */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Monthly Goal</h3>
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-fixly-text-muted">Progress</span>
            <span className="text-fixly-text">
              {formatCurrency(earnings.thisMonth)} / {formatCurrency(MONTHLY_GOAL)}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min((earnings.thisMonth / MONTHLY_GOAL) * 100, 100)}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-fixly-text-muted">
          {earnings.thisMonth >= MONTHLY_GOAL
            ? 'Goal achieved! Set a higher target.'
            : `${formatCurrency(MONTHLY_GOAL - earnings.thisMonth)} to go`}
        </p>
      </div>
    </div>
  );
}
