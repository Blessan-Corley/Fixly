'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';

import { ProtectedRoute } from '@/app/providers';
import { DesktopSidebar } from '@/components/dashboard/layout/DesktopSidebar';
import { type DashboardUser } from '@/components/dashboard/layout/layout.types';
import { MobileNav } from '@/components/dashboard/layout/MobileNav';
import { TopBar } from '@/components/dashboard/layout/TopBar';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

import { useDashboardLayout } from './layout.hooks';

const ResponsiveMobileNav = dynamic(() => import('@/components/ui/MobileNav'), {
  ssr: false,
  loading: () => null,
});

const MobileBottomNav = dynamic(
  () => import('@/components/ui/MobileNav').then((mod) => mod.MobileBottomNav),
  { ssr: false, loading: () => null }
);

export default function DashboardLayoutClient({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ProtectedRoute>
      <DashboardContent>{children}</DashboardContent>
    </ProtectedRoute>
  );
}

function DashboardContent({ children }: { children: ReactNode }): JSX.Element {
  const router = useRouter();
  const {
    user,
    sidebarHovered,
    setSidebarHovered,
    isRealTimeConnected,
    badgeStyle,
    notificationDropdownOpen,
    setNotificationDropdownOpen,
    profileDropdownOpen,
    setProfileDropdownOpen,
    subscriptionInfo,
    navigationItems,
    isMobileNavOpen,
    activeModal,
    deviceInfo,
    mobileNav,
    openMobileNav,
    closeMobileNav,
    openModal,
    closeModal,
    handleNotificationClick,
    handleSignOut,
    markAllNotificationsAsRead,
  } = useDashboardLayout();

  return (
    <div className="min-h-screen bg-fixly-bg">
      {deviceInfo.isMobile && (
        <ResponsiveMobileNav
          isOpen={isMobileNavOpen || mobileNav.isOpen}
          onClose={() => {
            closeMobileNav();
            mobileNav.close();
          }}
          navigationItems={navigationItems}
        />
      )}

      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMobileNav}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-40 hidden bg-black/10 lg:block"
          />
        )}
      </AnimatePresence>

      <DesktopSidebar
        user={user as DashboardUser | null}
        subscriptionInfo={subscriptionInfo}
        navigationItems={navigationItems}
        badgeStyle={badgeStyle}
        onNavigate={(href) => router.push(href)}
        onHoverChange={setSidebarHovered}
      />

      <MobileNav
        isOpen={isMobileNavOpen}
        user={user as DashboardUser | null}
        subscriptionInfo={subscriptionInfo}
        navigationItems={navigationItems}
        badgeStyle={badgeStyle}
        onNavigate={(href) => router.push(href)}
        onClose={closeMobileNav}
      />

      <div
        className={`transition-all duration-300 ease-out lg:ml-[72px] ${
          sidebarHovered ? 'lg:blur-sm lg:brightness-75' : ''
        }`}
      >
        <TopBar
          title={navigationItems.find((item) => item.current)?.name || 'Dashboard'}
          onMobileMenuClick={
            deviceInfo.isMobile
              ? () => {
                  openMobileNav();
                  mobileNav.open();
                }
              : openMobileNav
          }
          isRealTimeConnected={isRealTimeConnected}
          badgeStyle={badgeStyle}
          notificationDropdownOpen={notificationDropdownOpen}
          onNotificationDropdownOpenChange={setNotificationDropdownOpen}
          onMarkAllAsRead={() => {
            void markAllNotificationsAsRead();
          }}
          onNotificationClick={(notification) => {
            void handleNotificationClick(notification);
            setNotificationDropdownOpen(false);
          }}
          onViewAllNotifications={() => {
            router.push('/dashboard/notifications');
            setNotificationDropdownOpen(false);
          }}
          profileDropdownOpen={profileDropdownOpen}
          onProfileDropdownOpenChange={setProfileDropdownOpen}
          user={user as DashboardUser | null}
          subscriptionInfo={subscriptionInfo}
          onNavigate={(href) => router.push(href)}
          onRequestSignOut={() => openModal('signOut')}
        />

        <main className={`min-h-[calc(100vh-80px)] ${deviceInfo.isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>

        {deviceInfo.isMobile && (
          <MobileBottomNav
            navigationItems={navigationItems.slice(0, 5)}
            className="safe-area-pb"
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={activeModal === 'signOut'}
        onClose={closeModal}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to sign in again to access your account."
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        icon={LogOut}
        iconColor="text-red-600"
      />
    </div>
  );
}
