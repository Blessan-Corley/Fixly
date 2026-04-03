'use client';

import type { ChartMode, EarningsHistoryPoint } from './earnings.types';
import { formatCurrency } from './earnings.utils';

type EarningsTrendChartProps = {
  earningsHistory: EarningsHistoryPoint[];
  showChart: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
};

export default function EarningsTrendChart({
  earningsHistory,
  showChart,
  onChartModeChange,
}: EarningsTrendChartProps) {
  return (
    <div className="card">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-fixly-text">Earnings Trend</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onChartModeChange('earnings')}
            className={`btn-ghost text-sm ${showChart === 'earnings' ? 'bg-fixly-accent' : ''}`}
          >
            Earnings
          </button>
          <button
            onClick={() => onChartModeChange('jobs')}
            className={`btn-ghost text-sm ${showChart === 'jobs' ? 'bg-fixly-accent' : ''}`}
          >
            Jobs
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {earningsHistory.map((data) => (
          <div key={data.month} className="flex items-center">
            <div className="w-12 text-sm text-fixly-text-muted">{data.month}</div>
            <div className="mx-4 flex-1">
              <div className="h-2 rounded-full bg-fixly-border">
                <div
                  className="h-2 rounded-full bg-fixly-accent transition-all duration-500"
                  style={{
                    width: `${
                      showChart === 'earnings'
                        ? (data.earnings / 20000) * 100
                        : (data.jobs / 15) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="w-20 text-right text-sm font-medium text-fixly-text">
              {showChart === 'earnings' ? formatCurrency(data.earnings) : `${data.jobs} jobs`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
