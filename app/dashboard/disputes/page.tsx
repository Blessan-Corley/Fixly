'use client';

import { CheckCircle, Clock, Eye, Loader, Scale, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { useDisputesQuery } from '@/hooks/query/disputes';

import DisputeFilterBar from './DisputeFilterBar';
import DisputeListItem from './DisputeListItem';
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
import DisputeStatCards from './DisputeStatCards';

export default function DisputesPage() {
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
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between lg:flex-row lg:items-center">
        <div className="flex items-center">
          <div className="mr-4 rounded-lg bg-red-100 p-3">
            <Scale className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="mb-1 text-2xl font-bold text-fixly-text">Disputes</h1>
            <p className="text-fixly-text-light">Manage and track dispute resolutions</p>
          </div>
        </div>
      </div>

      {/* Stat Cards — admin/moderator only */}
      {statistics && canViewStats && <DisputeStatCards statCards={statCards} />}

      {/* Filter Bar */}
      <DisputeFilterBar filters={filters} onFilterChange={updateFilter} />

      {/* Dispute List */}
      {disputes.length === 0 ? (
        <div className="py-12 text-center">
          <Scale className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">No disputes found</h3>
          <p className="text-fixly-text-light">
            {filters.search || filters.status !== 'all' || filters.category !== 'all'
              ? 'Try adjusting your filters'
              : 'No disputes have been filed yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute, index) => {
            const otherParty =
              dispute.initiatedBy._id === sessionUser?.id
                ? dispute.againstUser
                : dispute.initiatedBy;

            return (
              <DisputeListItem
                key={dispute._id}
                dispute={dispute}
                index={index}
                currentUserId={sessionUser?.id}
                otherParty={otherParty}
                onClick={(disputeId) => router.push(`/dashboard/disputes/${disputeId}`)}
              />
            );
          })}
        </div>
      )}

      {/* Load More */}
      {pagination.hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-secondary mx-auto flex items-center"
          >
            {loadingMore ? (
              <Loader className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <TrendingUp className="mr-2 h-5 w-5" />
            )}
            {loadingMore ? 'Loading...' : 'Load More Disputes'}
          </button>
        </div>
      )}
    </div>
  );
}
