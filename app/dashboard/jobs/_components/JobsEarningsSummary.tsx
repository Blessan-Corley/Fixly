'use client';

import { CheckCircle, DollarSign, TrendingUp } from 'lucide-react';

import { formatCurrency } from '@/app/dashboard/jobs/_lib/jobs.helpers';
import type { EarningsState } from '@/app/dashboard/jobs/_lib/jobs.types';

export function JobsEarningsSummary({
  earnings,
}: {
  earnings: EarningsState;
}): React.JSX.Element {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-fixly-text-muted">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">Rs. {formatCurrency(earnings.total)}</p>
          </div>
          <DollarSign className="h-8 w-8 text-green-500" />
        </div>
      </div>
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-fixly-text-muted">This Month</p>
            <p className="text-2xl font-bold text-blue-600">Rs. {formatCurrency(earnings.thisMonth)}</p>
          </div>
          <TrendingUp className="h-8 w-8 text-blue-500" />
        </div>
      </div>
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-fixly-text-muted">Completed Jobs</p>
            <p className="text-2xl font-bold text-fixly-text">{earnings.completedJobs}</p>
          </div>
          <CheckCircle className="h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    </div>
  );
}
