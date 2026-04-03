'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  isAbortError,
  isRecord,
  normalizeEnvHealthVariables,
  normalizeJob,
  normalizeStats,
  normalizeUser,
  normalizeVerificationApplication,
  toNumberSafe,
} from '@/app/dashboard/admin/_lib/admin.helpers';
import type {
  AdminJob,
  AdminStats,
  AdminTab,
  AdminUser,
  VerificationAction,
  VerificationApplication,
  VerificationStatus,
  UserAction,
  UserFilter,
} from '@/app/dashboard/admin/_lib/admin.types';
import { useEnvHealthQuery } from '@/hooks/query/envHealth';
import { Channels, type AdminActivityPayload } from '@/lib/ably/events';
import { useAblyChannel } from '@/lib/ably/hooks';
import {
  useAdminVerificationAction,
  useAdminUserAction,
  useAdminJobs,
  useAdminMetrics,
  useAdminUsers,
  useAdminVerificationQueue,
  useRefreshAdminMetrics,
} from '@/lib/queries/admin';
import { queryKeys } from '@/lib/queries/keys';

export function useAdminDashboardController() {
  const [showEnvHealth, setShowEnvHealth] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus>('pending');
  const [selectedApplication, setSelectedApplication] = useState<VerificationApplication | null>(
    null
  );
  const [showReviewModal, setShowReviewModal] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: adminMetricsData,
    isLoading: metricsLoading,
    isFetching: metricsFetching,
    isError: metricsError,
  } = useAdminMetrics();
  const { mutateAsync: refreshMetrics, isPending: metricsRefreshing } = useRefreshAdminMetrics();
  const { mutateAsync: runVerificationAction } = useAdminVerificationAction();
  const { mutateAsync: runUserAction } = useAdminUserAction();
  const {
    data: usersResponse,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useAdminUsers({ limit: 10 });
  const {
    data: jobsResponse,
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = useAdminJobs({ limit: 10 });
  const {
    data: verificationResponse,
    isLoading: verificationLoading,
    refetch: refetchVerification,
  } = useAdminVerificationQueue(verificationFilter);
  const { data: envHealthData, isLoading: envHealthLoading } = useEnvHealthQuery();

  const stats = normalizeStats(adminMetricsData);
  const envHealthVariables = normalizeEnvHealthVariables(envHealthData);
  const envHealthRoot = isRecord(envHealthData) ? envHealthData : {};
  const envHealth = isRecord(envHealthRoot.health) ? envHealthRoot.health : {};
  const healthScore = toNumberSafe(envHealth.healthScore);
  const loading =
    metricsLoading ||
    usersLoading ||
    jobsLoading ||
    (activeTab === 'verification' && verificationLoading);

  const users = useMemo<AdminUser[]>(() => {
    const usersPayload =
      isRecord(usersResponse) && Array.isArray(usersResponse.users) ? usersResponse.users : [];
    return usersPayload.map(normalizeUser).filter((adminUser) => adminUser._id.length > 0);
  }, [usersResponse]);

  const recentJobs = useMemo<AdminJob[]>(() => {
    const jobsPayload =
      isRecord(jobsResponse) && Array.isArray(jobsResponse.jobs) ? jobsResponse.jobs : [];
    return jobsPayload.map(normalizeJob).filter((adminJob) => adminJob._id.length > 0);
  }, [jobsResponse]);

  const verificationApplications = useMemo<VerificationApplication[]>(() => {
    const applicationsPayload =
      isRecord(verificationResponse) && Array.isArray(verificationResponse.applications)
        ? verificationResponse.applications
        : [];

    return applicationsPayload
      .map(normalizeVerificationApplication)
      .filter((application) => application.id.length > 0);
  }, [verificationResponse]);

  useEffect(() => {
    if (metricsError) {
      toast.error('Failed to fetch admin metrics');
    }
  }, [metricsError]);

  useAblyChannel(
    Channels.admin,
    useCallback(
      (message) => {
        const payload =
          message.data && typeof message.data === 'object'
            ? (message.data as AdminActivityPayload)
            : null;

        if (!payload) {
          return;
        }

        if (payload.entityType === 'user') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
        }

        if (payload.entityType === 'job') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.admin.jobs() });
        }

        if (payload.entityType === 'dispute') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.admin.disputes() });
        }

        void queryClient.invalidateQueries({ queryKey: queryKeys.admin.metrics });
      },
      [queryClient]
    )
  );

  const handleVerificationAction = useCallback(
    async (
      userId: string,
      action: VerificationAction,
      rejectionReason = ''
    ): Promise<void> => {
      try {
        await runVerificationAction({ userId, action, rejectionReason });
        void refetchVerification();
        setShowReviewModal(false);
        setSelectedApplication(null);
      } catch (error) {
        if (isAbortError(error)) return;
      }
    },
    [refetchVerification, runVerificationAction]
  );

  const handleUserAction = useCallback(
    async (userId: string, action: UserAction): Promise<void> => {
      try {
        await runUserAction({ userId, action });
        void Promise.all([refetchUsers(), refetchJobs()]);
      } catch (error) {
        if (isAbortError(error)) return;
      }
    },
    [refetchJobs, refetchUsers, runUserAction]
  );

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((adminUser) => {
    if (userFilter === 'banned' && !adminUser.banned) {
      return false;
    }
    if (userFilter !== 'all' && userFilter !== 'banned' && adminUser.role !== userFilter) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    return (
      adminUser.name.toLowerCase().includes(normalizedSearchTerm) ||
      adminUser.email.toLowerCase().includes(normalizedSearchTerm) ||
      adminUser.username.toLowerCase().includes(normalizedSearchTerm)
    );
  });

  const effectiveStats: AdminStats = stats;

  return {
    loading,
    activeTab,
    setActiveTab,
    showEnvHealth,
    setShowEnvHealth,
    users,
    recentJobs,
    userFilter,
    setUserFilter,
    searchTerm,
    setSearchTerm,
    verificationApplications,
    verificationFilter,
    setVerificationFilter,
    selectedApplication,
    setSelectedApplication,
    showReviewModal,
    setShowReviewModal,
    handleVerificationAction,
    handleUserAction,
    filteredUsers,
    effectiveStats,
    metricsLoading,
    metricsFetching,
    metricsRefreshing,
    refreshMetrics,
    adminMetricsData,
    envHealthLoading,
    envHealthVariables,
    healthScore,
  };
}
