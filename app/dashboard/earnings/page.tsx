'use client';

import { Download, Loader } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives/Select';

import { RoleGuard, useApp } from '../../providers';

import EarningsMetricCards from './EarningsMetricCards';
import EarningsSidebar from './EarningsSidebar';
import EarningsTrendChart from './EarningsTrendChart';
import RecentJobsList from './RecentJobsList';
import { useEarningsPage } from './useEarningsPage';

export default function EarningsPage() {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <EarningsContent />
    </RoleGuard>
  );
}

function EarningsContent() {
  const { user } = useApp();
  const {
    earnings,
    earningsHistory,
    recentJobs,
    loading,
    timeFilter,
    showChart,
    setShowChart,
    handleTimeFilterChange,
    exportEarnings,
  } = useEarningsPage();

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between lg:flex-row lg:items-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-fixly-text">Earnings Dashboard</h1>
          <p className="text-fixly-text-light">Track your income and financial progress</p>
        </div>

        <div className="mt-4 flex items-center space-x-4 lg:mt-0">
          <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
            <SelectTrigger className="select-field" aria-label="Time range">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <button onClick={exportEarnings} className="btn-secondary flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <EarningsMetricCards earnings={earnings} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EarningsTrendChart
            earningsHistory={earningsHistory}
            showChart={showChart}
            onChartModeChange={setShowChart}
          />
        </div>
        <EarningsSidebar earnings={earnings} user={user} />
      </div>

      <RecentJobsList recentJobs={recentJobs} />
    </div>
  );
}
