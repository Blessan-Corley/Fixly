'use client';

import { Loader, Scale, TrendingUp } from 'lucide-react';

import DisputeFilterBar from './DisputeFilterBar';
import DisputeListItem from './DisputeListItem';
import DisputeStatCards from './DisputeStatCards';
import { useDisputesPage } from './useDisputesPage';

export default function DisputesPage() {
  const {
    disputes,
    statistics,
    filters,
    pagination,
    loading,
    loadingMore,
    statCards,
    canViewStats,
    sessionUserId,
    loadMore,
    updateFilter,
    navigateToDispute,
  } = useDisputesPage();

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
              dispute.initiatedBy._id === sessionUserId
                ? dispute.againstUser
                : dispute.initiatedBy;

            return (
              <DisputeListItem
                key={dispute._id}
                dispute={dispute}
                index={index}
                currentUserId={sessionUserId}
                otherParty={otherParty}
                onClick={navigateToDispute}
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
