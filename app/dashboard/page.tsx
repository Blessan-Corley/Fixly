'use client';

import VerificationPrompt from '@/components/dashboard/VerificationPrompt';

import { GlobalLoading } from '../../components/ui/GlobalLoading';
import { MobilePullToRefresh, useMobileDevice } from '../../components/ui/mobile';

import { DashboardQuickActions } from './_components/DashboardQuickActions';
import { DashboardRecentJobs } from './_components/DashboardRecentJobs';
import { DashboardRightSidebar } from './_components/DashboardRightSidebar';
import { DashboardStatsGrid } from './_components/DashboardStatsGrid';
import { DashboardUpgradeNotice } from './_components/DashboardUpgradeNotice';
import { DashboardWelcomeHeader } from './_components/DashboardWelcomeHeader';
import { useDashboardPage } from './_hooks/useDashboardPage';

export default function DashboardPage(): React.JSX.Element {
  const {
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
  } = useDashboardPage();

  const deviceInfo = useMobileDevice();

  if (loading) {
    return (
      <GlobalLoading
        loading={true}
        showRefreshMessage={showRefreshMessage}
        message="Loading dashboard..."
        fullScreen={false}
        className="min-h-[60vh]"
      />
    );
  }

  return (
    <MobilePullToRefresh onRefresh={handleRefresh} className="min-h-full">
      <div className={`${deviceInfo.isMobile ? 'mobile-p-4' : 'p-6 lg:p-8'}`}>
        <DashboardWelcomeHeader user={user} isMobile={deviceInfo.isMobile} />

        {user?.role === 'fixer' && (
          <DashboardUpgradeNotice creditsUsed={creditsUsed} />
        )}

        <VerificationPrompt variant="banner" />

        <DashboardStatsGrid
          stats={stats}
          user={user}
          pageLoading={pageLoading}
          isMobile={deviceInfo.isMobile}
        />

        <div
          className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-8`}
        >
          <div className={`${deviceInfo.isMobile ? '' : 'lg:col-span-2'}`}>
            <DashboardQuickActions quickActions={quickActions} isMobile={deviceInfo.isMobile} />
            <DashboardRecentJobs recentJobs={recentJobs} user={user} />
          </div>

          <DashboardRightSidebar user={user} nextStep={nextStep} creditsUsed={creditsUsed} />
        </div>
      </div>
    </MobilePullToRefresh>
  );
}
