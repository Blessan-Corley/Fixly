'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Channels, Events } from '@/lib/ably/events';
import { useAblyEvent } from '@/lib/ably/hooks';
import { useEarnings } from '@/lib/queries/earnings';
import { queryKeys } from '@/lib/queries/keys';

import type { ChartMode, EarningsHistoryPoint, EarningsState, RecentJob, TimeFilter } from './earnings.types';
import { PERIOD_MAP } from './earnings.types';
import { isRecord, parseEarningsHistory, parseEarningsState, toRecentJob } from './earnings.utils';

const DEFAULT_EARNINGS: EarningsState = {
  total: 0,
  thisMonth: 0,
  lastMonth: 0,
  thisWeek: 0,
  pendingPayments: 0,
  completedJobs: 0,
  averageJobValue: 0,
  topJobCategory: '',
  growth: { monthly: 0, weekly: 0 },
};

export interface EarningsPageState {
  earnings: EarningsState;
  earningsHistory: EarningsHistoryPoint[];
  recentJobs: RecentJob[];
  loading: boolean;
  timeFilter: TimeFilter;
  showChart: ChartMode;
  setShowChart: (mode: ChartMode) => void;
  handleTimeFilterChange: (value: string) => void;
  exportEarnings: () => void;
}

export function useEarningsPage(): EarningsPageState {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [earnings, setEarnings] = useState<EarningsState>(DEFAULT_EARNINGS);
  const [earningsHistory, setEarningsHistory] = useState<EarningsHistoryPoint[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
  const [showChart, setShowChart] = useState<ChartMode>('earnings');

  const earningsFilters = useMemo(
    () => ({ period: PERIOD_MAP[timeFilter] ?? 'month', details: '1' }),
    [timeFilter]
  );

  const {
    data: earningsResponse,
    isLoading: earningsLoading,
    isFetching: earningsFetching,
    isError: earningsError,
  } = useEarnings(earningsFilters);

  useAblyEvent(
    session?.user?.id ? Channels.user(session.user.id) : '',
    Events.user.paymentConfirmed,
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.earnings.list(earningsFilters) });
      toast.success('Payment received', {
        description: 'Refreshing your earnings dashboard with the latest payment.',
      });
    }, [earningsFilters, queryClient]),
    Boolean(session?.user?.id)
  );

  useEffect(() => {
    setLoading(earningsLoading || earningsFetching);
    const payload = isRecord(earningsResponse) ? earningsResponse : {};

    setEarnings(parseEarningsState(payload));
    setEarningsHistory(parseEarningsHistory(payload.history));

    if (Array.isArray(payload.recentJobs)) {
      setRecentJobs(
        payload.recentJobs
          .map((job) => toRecentJob(job))
          .filter((job): job is RecentJob => job !== null)
      );
    } else {
      setRecentJobs([]);
    }
  }, [earningsFetching, earningsLoading, earningsResponse]);

  useEffect(() => {
    if (earningsError) {
      toast.error('Failed to fetch earnings data');
    }
  }, [earningsError]);

  const handleTimeFilterChange = (value: string): void => {
    if (
      value === 'this_week' ||
      value === 'this_month' ||
      value === 'last_month' ||
      value === 'this_year'
    ) {
      setTimeFilter(value);
    }
  };

  const exportEarnings = (): void => {
    if (!recentJobs || recentJobs.length === 0) {
      toast.error('No earnings data to export');
      return;
    }

    const csvData = recentJobs.map((job) => ({
      Date: job.progress.completedAt
        ? new Date(job.progress.completedAt).toLocaleDateString()
        : 'N/A',
      Job: job.title,
      Amount: job.budget.amount,
      Client: job.createdBy.name,
      Status: job.status,
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixly-earnings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast.success('Earnings report exported successfully');
  };

  return {
    earnings,
    earningsHistory,
    recentJobs,
    loading,
    timeFilter,
    showChart,
    setShowChart,
    handleTimeFilterChange,
    exportEarnings,
  };
}
