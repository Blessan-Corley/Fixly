'use client';

import { CheckCircle, Clock, Eye, Scale } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { useDisputesQuery } from '@/hooks/query/disputes';

import { normalizeDispute, normalizePagination, normalizeStatistics } from './disputes.normalize';
import type {
  DisputeFilters,
  DisputeRecord,
  DisputeStatistics,
  DisputesApiPayload,
  PaginationState,
  SessionUser,
  StatCard,
} from './disputes.types';
import { DEFAULT_FILTERS, DEFAULT_PAGINATION } from './disputes.types';

export interface UseDisputesPageReturn {
  disputes: DisputeRecord[];
  statistics: DisputeStatistics | null;
  filters: DisputeFilters;
  pagination: PaginationState;
  loading: boolean;
  loadingMore: boolean;
  isError: boolean;
  statCards: StatCard[];
  canViewStats: boolean;
  sessionUserId: string | undefined;
  loadMore: () => void;
  updateFilter: <K extends keyof DisputeFilters>(
    key: K,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  navigateToDispute: (disputeId: string) => void;
}

export function useDisputesPage(): UseDisputesPageReturn {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as SessionUser | undefined;

  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [statistics, setStatistics] = useState<DisputeStatistics | null>(null);
  const [filters, setFilters] = useState<DisputeFilters>(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: disputesResponse,
    isLoading: loading,
    isFetching,
    isError,
  } = useDisputesQuery({
    page: currentPage,
    limit: 10,
    sortBy: filters.sortBy,
    sortOrder: 'desc',
    status: filters.status !== 'all' ? filters.status : undefined,
    category: filters.category !== 'all' ? filters.category : undefined,
    search: filters.search.trim() || undefined,
  });

  const loadingMore = isFetching && currentPage > 1;

  useEffect(() => {
    if (!sessionUser?.id) return;
    setCurrentPage(1);
  }, [filters, sessionUser?.id]);

  useEffect(() => {
    const payload = (disputesResponse ?? {}) as DisputesApiPayload;
    const nextDisputes = Array.isArray(payload.disputes)
      ? payload.disputes
          .map((item, index) => normalizeDispute(item, index))
          .filter((item): item is DisputeRecord => item !== null)
      : [];

    if (currentPage === 1) {
      setDisputes(nextDisputes);
      setStatistics(normalizeStatistics(payload.statistics));
    } else if (nextDisputes.length > 0) {
      setDisputes((prev) => [...prev, ...nextDisputes]);
    }

    setPagination(normalizePagination(payload.pagination));
  }, [currentPage, disputesResponse]);

  useEffect(() => {
    if (isError) {
      toast.error('Failed to fetch disputes');
    }
  }, [isError]);

  const loadMore = (): void => {
    if (!pagination.hasMore || loadingMore) return;
    setCurrentPage((prev) => prev + 1);
  };

  const updateFilter =
    <K extends keyof DisputeFilters>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      const value = event.target.value as DisputeFilters[K];
      setFilters((prev) => ({ ...prev, [key]: value }));
    };

  const statCards: StatCard[] = [
    {
      label: 'Total',
      value: statistics?.total ?? 0,
      icon: Scale,
      cardClass: 'bg-blue-100',
      iconClass: 'text-blue-600',
    },
    {
      label: 'Pending',
      value: statistics?.pending ?? 0,
      icon: Clock,
      cardClass: 'bg-yellow-100',
      iconClass: 'text-yellow-600',
    },
    {
      label: 'In Review',
      value: statistics?.underReview ?? 0,
      icon: Eye,
      cardClass: 'bg-blue-100',
      iconClass: 'text-blue-600',
    },
    {
      label: 'In Mediation',
      value: statistics?.inMediation ?? 0,
      icon: Scale,
      cardClass: 'bg-fixly-accent/20',
      iconClass: 'text-fixly-primary',
    },
    {
      label: 'Resolved',
      value: statistics?.resolved ?? 0,
      icon: CheckCircle,
      cardClass: 'bg-green-100',
      iconClass: 'text-green-600',
    },
  ];

  const canViewStats = sessionUser?.role === 'admin' || sessionUser?.role === 'moderator';

  const navigateToDispute = (disputeId: string): void => {
    router.push(`/dashboard/disputes/${disputeId}`);
  };

  return {
    disputes,
    statistics,
    filters,
    pagination,
    loading,
    loadingMore,
    isError,
    statCards,
    canViewStats,
    sessionUserId: sessionUser?.id,
    loadMore,
    updateFilter,
    navigateToDispute,
  };
}
