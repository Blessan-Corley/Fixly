'use client';

import { Loader, Shield } from 'lucide-react';
import dynamic from 'next/dynamic';

import { AdminDashboardHeader } from '@/app/dashboard/admin/_components/AdminDashboardHeader';
import { AdminTabsNav } from '@/app/dashboard/admin/_components/AdminTabsNav';
import { useAdminDashboardController } from '@/app/dashboard/admin/_hooks/useAdminDashboardController';
import { formatDate } from '@/app/dashboard/admin/_lib/admin.helpers';

import { RoleGuard } from '../../providers';

const AdminVerificationReviewModal = dynamic(
  () => import('./_components/AdminVerificationReviewModal'),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 z-50 bg-black/30" />,
  }
);

const AdminStatsGrid = dynamic(
  () => import('@/app/dashboard/admin/_components/AdminStatsGrid').then((mod) => mod.AdminStatsGrid),
  {
    loading: () => <div className="h-40 animate-pulse rounded-2xl bg-fixly-card" />,
  }
);

const AdminOverviewTab = dynamic(
  () => import('@/app/dashboard/admin/_components/AdminOverviewTab').then((mod) => mod.AdminOverviewTab),
  {
    loading: () => <div className="h-96 animate-pulse rounded-2xl bg-fixly-card" />,
  }
);

const AdminUsersTab = dynamic(
  () => import('@/app/dashboard/admin/_components/AdminUsersTab').then((mod) => mod.AdminUsersTab),
  {
    loading: () => <div className="h-96 animate-pulse rounded-2xl bg-fixly-card" />,
  }
);

const AdminJobsTab = dynamic(
  () => import('@/app/dashboard/admin/_components/AdminJobsTab').then((mod) => mod.AdminJobsTab),
  {
    loading: () => <div className="h-96 animate-pulse rounded-2xl bg-fixly-card" />,
  }
);

const AdminReportsTab = dynamic(
  () => import('@/app/dashboard/admin/_components/AdminReportsTab').then((mod) => mod.AdminReportsTab),
  {
    loading: () => <div className="h-96 animate-pulse rounded-2xl bg-fixly-card" />,
  }
);

const AdminVerificationTab = dynamic(
  () =>
    import('@/app/dashboard/admin/_components/AdminVerificationTab').then(
      (mod) => mod.AdminVerificationTab
    ),
  {
    loading: () => <div className="h-96 animate-pulse rounded-2xl bg-fixly-card" />,
  }
);

export default function AdminPanelPage() {
  return (
    <RoleGuard
      roles={['admin']}
      fallback={
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="card">
              <Shield className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h2 className="mb-2 text-xl font-bold text-fixly-text">Admin Access Required</h2>
              <p className="mb-4 text-fixly-text-muted">
                You need admin privileges to access this panel.
              </p>
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="btn-primary w-full"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      }
    >
      <AdminPanelContent />
    </RoleGuard>
  );
}

function AdminPanelContent() {
  const controller = useAdminDashboardController();

  if ((controller.loading || controller.metricsLoading) && controller.adminMetricsData == null) {
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
      <AdminDashboardHeader
        lastUpdated={
          controller.effectiveStats.lastUpdated
            ? formatDate(controller.effectiveStats.lastUpdated, true)
            : 'Not available'
        }
        onRefresh={() => {
          void controller.refreshMetrics();
        }}
        isRefreshing={controller.metricsRefreshing}
      />

      <AdminStatsGrid
        stats={controller.effectiveStats}
        isFetching={controller.metricsFetching}
      />

      <div className="card mb-8 p-0">
        <AdminTabsNav
          activeTab={controller.activeTab}
          onTabChange={controller.setActiveTab}
        />

        <div className="p-6">
          {controller.activeTab === 'overview' && (
            <AdminOverviewTab
              showEnvHealth={controller.showEnvHealth}
              healthScore={controller.healthScore}
              envHealthVariables={controller.envHealthVariables}
              envHealthLoading={controller.envHealthLoading}
              onToggleEnvHealth={() =>
                controller.setShowEnvHealth((current: boolean) => !current)
              }
              users={controller.users}
              recentJobs={controller.recentJobs}
            />
          )}

          {controller.activeTab === 'users' && (
            <AdminUsersTab
              searchTerm={controller.searchTerm}
              userFilter={controller.userFilter}
              users={controller.filteredUsers}
              onSearchTermChange={controller.setSearchTerm}
              onUserFilterChange={controller.setUserFilter}
              onUserAction={(userId, action) => {
                void controller.handleUserAction(userId, action);
              }}
            />
          )}

          {controller.activeTab === 'jobs' && (
            <AdminJobsTab jobs={controller.recentJobs} />
          )}

          {controller.activeTab === 'verification' && (
            <AdminVerificationTab
              verificationFilter={controller.verificationFilter}
              applications={controller.verificationApplications}
              onVerificationFilterChange={controller.setVerificationFilter}
              onOpenReview={(application) => {
                controller.setSelectedApplication(application);
                controller.setShowReviewModal(true);
              }}
              onVerificationAction={(userId, action, rejectionReason) => {
                void controller.handleVerificationAction(userId, action, rejectionReason);
              }}
            />
          )}

          {controller.activeTab === 'reports' && (
            <AdminReportsTab stats={controller.effectiveStats} />
          )}
        </div>
      </div>

      {controller.showReviewModal && controller.selectedApplication && (
        <AdminVerificationReviewModal
          application={controller.selectedApplication}
          onClose={() => {
            controller.setShowReviewModal(false);
            controller.setSelectedApplication(null);
          }}
          onApprove={() =>
            controller.handleVerificationAction(controller.selectedApplication!.id, 'approve')
          }
          onReject={(reason) =>
            controller.handleVerificationAction(
              controller.selectedApplication!.id,
              'reject',
              reason
            )
          }
        />
      )}
    </div>
  );
}
