'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useDashboardStatsQuery, useRecentJobsQuery } from '@/hooks/query/dashboard';

import { usePageLoading } from '../../../contexts/LoadingContext';
import { useApp } from '../../providers';
import {
  DEFAULT_STATS,
  getCreditsUsed,
  getNextSteps,
  getQuickActions,
  parseDashboardStats,
  parseRecentJobs,
} from '../_lib/dashboard.helpers';
import type {
  DashboardStats,
  DashboardUser,
  NextStep,
  QuickAction,
  RecentJob,
} from '../_lib/dashboard.types';

export type DashboardPageState = {
  user: DashboardUser | null;
  loading: boolean;
  stats: DashboardStats;
  recentJobs: RecentJob[];
  quickActions: QuickAction[];
  pageLoading: boolean;
  showRefreshMessage: boolean;
  nextStep: NextStep;
  creditsUsed: number;
  handleRefresh: () => Promise<void>;
};

export function useDashboardPage(): DashboardPageState {
  const { user: rawUser, loading } = useApp();
  const user = (rawUser as DashboardUser | null) ?? null;

  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  const { loading: contextLoading, showRefreshMessage } = usePageLoading('dashboard');

  const {
    data: statsResponse,
    isLoading: statsLoading,
    isFetching: statsFetching,
    isError: statsError,
    refetch: refetchStats,
  } = useDashboardStatsQuery({ enabled: Boolean(user) });

  const {
    data: recentJobsResponse,
    isLoading: jobsLoading,
    isFetching: jobsFetching,
    isError: jobsError,
    refetch: refetchRecentJobs,
  } = useRecentJobsQuery({ enabled: Boolean(user) });

  const pageLoading =
    contextLoading || statsLoading || jobsLoading || statsFetching || jobsFetching;

  useEffect(() => {
    if (statsResponse) setStats(parseDashboardStats(statsResponse));
  }, [statsResponse]);

  useEffect(() => {
    if (recentJobsResponse) setRecentJobs(parseRecentJobs(recentJobsResponse));
  }, [recentJobsResponse]);

  useEffect(() => {
    if (statsError || jobsError) {
      toast.error('Failed to load dashboard data. Please refresh the page.');
    }
  }, [jobsError, statsError]);

  useEffect(() => {
    if (user?.role) {
      setQuickActions(getQuickActions(user.role, user));
    }
  }, [user]);

  const handleRefresh = async (): Promise<void> => {
    await Promise.all([refetchStats(), refetchRecentJobs()]);
  };

  const nextStep = getNextSteps(user);
  const creditsUsed = getCreditsUsed(user);

  return {
    user,
    loading,
    stats,
    recentJobs,
    quickActions,
    pageLoading,
    showRefreshMessage,
    nextStep,
    creditsUsed,
    handleRefresh,
  };
}
