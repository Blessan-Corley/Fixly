'use client';

import { JobsDashboardHeader } from '@/app/dashboard/jobs/_components/JobsDashboardHeader';
import { JobsDialogs } from '@/app/dashboard/jobs/_components/JobsDialogs';
import { JobsEarningsSummary } from '@/app/dashboard/jobs/_components/JobsEarningsSummary';
import { JobsEmptyState } from '@/app/dashboard/jobs/_components/JobsEmptyState';
import { JobsFiltersPanel } from '@/app/dashboard/jobs/_components/JobsFiltersPanel';
import { JobsList } from '@/app/dashboard/jobs/_components/JobsList';
import { JobsLoadMore } from '@/app/dashboard/jobs/_components/JobsLoadMore';
import { JobsStatusTabs } from '@/app/dashboard/jobs/_components/JobsStatusTabs';
import { JobsUpgradePrompt } from '@/app/dashboard/jobs/_components/JobsUpgradePrompt';
import { useJobsDashboardController } from '@/app/dashboard/jobs/_hooks/useJobsDashboardController';
import type { TabStatus } from '@/app/dashboard/jobs/_lib/jobs.types';
import { RoleGuard } from '@/app/providers';
import { GlobalLoading } from '@/components/ui/GlobalLoading';

function JobsPageContent(): React.JSX.Element {
  const controller = useJobsDashboardController();

  if (controller.loading && controller.jobs.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <GlobalLoading
          loading={controller.pageLoading || controller.loading}
          showRefreshMessage={controller.showRefreshMessage}
          message="Loading your jobs..."
          fullScreen={false}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {!controller.isOnline ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          You are offline. Some job actions are temporarily unavailable.
        </div>
      ) : null}
      <JobsDashboardHeader isProUser={controller.isProUser} onUpgrade={controller.goToSubscription} onPostJob={controller.goToPostJob} />
      {controller.activeTab === 'completed' ? <JobsEarningsSummary earnings={controller.earnings} /> : null}
      <JobsStatusTabs activeTab={controller.activeTab} tabCounts={controller.tabCounts} onTabChange={controller.setActiveTab} />
      <JobsFiltersPanel filters={controller.filters} showFilters={controller.showFilters} activeFilterCount={controller.activeFilterCount} total={controller.pagination.total} onSearchChange={(value: string) => controller.handleFilterChange('search', value)} onStatusChange={(status: TabStatus) => controller.handleFilterChange('status', status)} onToggleFilters={() => controller.setShowFilters((previous) => !previous)} onClear={controller.clearFilters} />
      {controller.jobs.length === 0 ? (
        <JobsEmptyState onPostJob={controller.goToPostJob} />
      ) : (
        <JobsList jobs={controller.jobs} onView={controller.viewJob} onEdit={controller.editJob} onDelete={controller.openDeleteModal} onRepost={controller.openRepostModal} />
      )}
      {controller.pagination.hasMore && controller.jobs.length > 0 ? <JobsLoadMore loading={controller.loading} onLoadMore={controller.loadMore} /> : null}
      {!controller.isProUser && controller.jobsPosted >= 3 ? <JobsUpgradePrompt onUpgrade={controller.goToSubscription} /> : null}
      <JobsDialogs deleteModal={controller.deleteModal} repostModal={controller.repostModal} onCloseDelete={controller.closeDeleteModal} onConfirmDelete={controller.handleDeleteJob} onCloseRepost={controller.closeRepostModal} onConfirmRepost={controller.handleRepostJob} />
    </div>
  );
}

export default function JobsPage(): React.JSX.Element {
  return (
    <RoleGuard roles={['hirer']} fallback={<div>Access denied</div>}>
      <JobsPageContent />
    </RoleGuard>
  );
}
