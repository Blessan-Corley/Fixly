'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useDashboardStatsQuery, useRecentJobsQuery } from '@/hooks/query/dashboard';

import { useMobileDevice } from '../../../components/ui/mobile';
import { usePageLoading } from '../../../contexts/LoadingContext';
import { useApp } from '../../providers';
import {
  DEFAULT_STATS,
  parseDashboardStats,
  parseRecentJobs,
  getQuickActions,
  getNextSteps,
  getGreeting,
} from '../_lib/dashboard.helpers';
import type {
  DashboardStats,
  DashboardUser,
  RecentJob,
  QuickAction,
  NextStep,
} from '../_lib/dashboard.types';

export type DashboardController = {
  user: DashboardUser | null;
  loading: boolean;
  pageLoading: boolean;
  showRefreshMessage: boolean;
  stats: DashboardStats;
  recentJobs: RecentJob[];
  quickActions: QuickAction[];
  nextStep: NextStep;
  deviceInfo: ReturnType<typeof useMobileDevice>;
  greeting: string;
  handleRefresh: () => Promise<void>;
};

export function useDashboardController(): DashboardController {
  const { user: rawUser, loading } = useApp();
  const user = rawUser as DashboardUser | null;

  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  const { loading: contextLoading, showRefreshMessage } = usePageLoading('dashboard');

  const deviceInfo = useMobileDevice();

  const {
    data: statsResponse,
    isLoading: statsLoading,
    isFetching: statsFetching,
    isError: statsError,
    refetch: refetchStats,
  } = useDashboardStatsQuery({
    enabled: Boolean(user),
  });

  const {
    data: recentJobsResponse,
    isLoading: jobsLoading,
    isFetching: jobsFetching,
    isError: jobsError,
    refetch: refetchRecentJobs,
  } = useRecentJobsQuery({
    enabled: Boolean(user),
  });

  const pageLoading =
    contextLoading || statsLoading || jobsLoading || statsFetching || jobsFetching;

  useEffect(() => {
    if (statsResponse) {
      setStats(parseDashboardStats(statsResponse));
    }
  }, [statsResponse]);

  useEffect(() => {
    if (recentJobsResponse) {
      setRecentJobs(parseRecentJobs(recentJobsResponse));
    }
  }, [recentJobsResponse]);

  useEffect(() => {
    if (statsError || jobsError) {
      toast.error('Failed to load dashboard data. Please refresh the page.');
    }
  }, [jobsError, statsError]);

  useEffect(() => {
    if (user?.role) {
      const actions = getQuickActions(user.role, user);
      setQuickActions(actions);
    }
  }, [user]);

  const handleRefresh = async (): Promise<void> => {
    await Promise.all([refetchStats(), refetchRecentJobs()]);
  };

  const nextStep = getNextSteps(user);
  const greeting = getGreeting();

  return {
    user,
    loading,
    pageLoading,
    showRefreshMessage,
    stats,
    recentJobs,
    quickActions,
    nextStep,
    deviceInfo,
    greeting,
    handleRefresh,
  };
}
