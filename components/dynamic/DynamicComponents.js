// components/dynamic/DynamicComponents.js - Dynamic imports for code splitting
'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner, LoadingSkeleton } from '../ui/LoadingStates';

// Admin Dashboard - Heavy component, load on demand
export const AdminDashboard = dynamic(
  () => import('../admin/AdminDashboard'),
  {
    loading: () => (
      <div className="min-h-screen bg-fixly-bg dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <LoadingSkeleton className="h-8 w-64 mb-2" />
            <LoadingSkeleton className="h-4 w-96" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
                <LoadingSkeleton className="h-4 w-24 mb-4" />
                <LoadingSkeleton className="h-8 w-16 mb-2" />
                <LoadingSkeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LoadingSkeleton className="h-64 w-full" />
            </div>
            <div>
              <LoadingSkeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

// Advanced Search - Load when search is opened
export const AdvancedSearch = dynamic(
  () => import('../search/AdvancedSearch'),
  {
    loading: () => (
      <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
        <LoadingSkeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <LoadingSkeleton className="h-4 w-20" />
              <LoadingSkeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
);

// Chart Components - Heavy D3/Chart libraries
export const LineChart = dynamic(
  () => import('../charts/LineChart'),
  {
    loading: () => (
      <div className="h-64 bg-fixly-card dark:bg-gray-800 rounded-xl border border-fixly-border dark:border-gray-700 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    ),
    ssr: false
  }
);

export const PieChart = dynamic(
  () => import('../charts/PieChart'),
  {
    loading: () => (
      <div className="h-64 bg-fixly-card dark:bg-gray-800 rounded-xl border border-fixly-border dark:border-gray-700 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    ),
    ssr: false
  }
);

// Instagram Comments - Real-time heavy component
export const InstagramCommentsRealtime = dynamic(
  () => import('../InstagramCommentsRealtime'),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 m-4 max-w-md w-full border border-fixly-border dark:border-gray-700">
          <LoadingSkeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <LoadingSkeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <LoadingSkeleton className="h-4 w-20 mb-1" />
                  <LoadingSkeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

// Virtual Lists - Performance critical, load on demand
export const VirtualJobList = dynamic(
  () => import('../jobs/VirtualJobList'),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <LoadingSkeleton className="h-6 w-3/4 mb-2" />
                <div className="flex items-center gap-4">
                  <LoadingSkeleton className="h-4 w-24" />
                  <LoadingSkeleton className="h-4 w-16" />
                  <LoadingSkeleton className="h-4 w-20" />
                </div>
              </div>
              <LoadingSkeleton className="h-6 w-16" />
            </div>
            
            <LoadingSkeleton className="h-4 w-full mb-2" />
            <LoadingSkeleton className="h-4 w-2/3 mb-4" />
            
            <div className="flex gap-2 mb-4">
              <LoadingSkeleton className="h-6 w-16" />
              <LoadingSkeleton className="h-6 w-20" />
              <LoadingSkeleton className="h-6 w-18" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <LoadingSkeleton className="h-5 w-24" />
                <LoadingSkeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <LoadingSkeleton className="h-8 w-20" />
                <LoadingSkeleton className="h-8 w-20" />
                <LoadingSkeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: false
  }
);

// Unified Skill Selector - Load when needed (works as modal or inline)
export const SkillSelector = dynamic(
  () => import('../SkillSelector/SkillSelector'),
  {
    loading: () => (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <LoadingSkeleton className="h-6 w-40 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
);

// File Upload Components - Load when file operations are needed
export const FileUploadZone = dynamic(
  () => import('../ui/FileUploadZone'),
  {
    loading: () => (
      <div className="border-2 border-dashed border-fixly-border dark:border-gray-600 rounded-xl p-8 text-center">
        <LoadingSpinner />
        <p className="mt-2 text-fixly-text-muted dark:text-gray-400">Loading file upload...</p>
      </div>
    ),
    ssr: false
  }
);

// Rich Text Editor - Heavy component
export const RichTextEditor = dynamic(
  () => import('../ui/RichTextEditor'),
  {
    loading: () => (
      <div className="border border-fixly-border dark:border-gray-600 rounded-xl p-4">
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-8 w-8" />
          ))}
        </div>
        <LoadingSkeleton className="h-32 w-full" />
      </div>
    ),
    ssr: false
  }
);

// Calendar/Date Picker - Load when scheduling features are used
export const DatePicker = dynamic(
  () => import('../ui/DatePicker'),
  {
    loading: () => (
      <div className="bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-700 rounded-xl p-4">
        <LoadingSkeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
);

// Map Components - Heavy mapping libraries
export const MapView = dynamic(
  () => import('../maps/MapView'),
  {
    loading: () => (
      <div className="h-64 bg-fixly-card dark:bg-gray-800 rounded-xl border border-fixly-border dark:border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-2 text-fixly-text-muted dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

// QR Code Generator/Scanner - Load on demand
export const QRCodeScanner = dynamic(
  () => import('../ui/QRCodeScanner'),
  {
    loading: () => (
      <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700 text-center">
        <LoadingSpinner size="large" />
        <p className="mt-2 text-fixly-text-muted dark:text-gray-400">Loading scanner...</p>
      </div>
    ),
    ssr: false
  }
);

// Video Call Components - Heavy WebRTC libraries
export const VideoCall = dynamic(
  () => import('../communication/VideoCall'),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center text-white">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-lg">Connecting to video call...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

// Settings Pages - Administrative features
export const SettingsPage = dynamic(
  () => import('../settings/SettingsPage'),
  {
    loading: () => (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSkeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <LoadingSkeleton className="h-48 w-full" />
          </div>
          <div className="md:col-span-2">
            <LoadingSkeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

// Analytics Dashboard Components
export const AnalyticsDashboard = dynamic(
  () => import('../analytics/AnalyticsDashboard'),
  {
    loading: () => (
      <div className="space-y-6">
        <LoadingSkeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
              <LoadingSkeleton className="h-12 w-12 mb-4" />
              <LoadingSkeleton className="h-4 w-24 mb-2" />
              <LoadingSkeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-64 w-full" />
          <LoadingSkeleton className="h-64 w-full" />
        </div>
      </div>
    ),
    ssr: false
  }
);

// Lazy loaded feature flags component
export const FeatureFlag = dynamic(
  () => import('../utils/FeatureFlag'),
  {
    loading: () => null, // No loading state for feature flags
    ssr: true // Can be server-side rendered
  }
);

// PWA Install Prompt
export const PWAInstallPrompt = dynamic(
  () => import('../pwa/PWAInstallPrompt'),
  {
    loading: () => null,
    ssr: false
  }
);

// Notification Center
export const NotificationCenter = dynamic(
  () => import('../ui/NotificationCenter'),
  {
    loading: () => (
      <div className="fixed top-4 right-4 bg-fixly-card dark:bg-gray-800 rounded-xl p-4 border border-fixly-border dark:border-gray-700 shadow-xl">
        <LoadingSpinner />
      </div>
    ),
    ssr: false
  }
);

// Help/Support Chat Widget
export const SupportChat = dynamic(
  () => import('../support/SupportChat'),
  {
    loading: () => (
      <div className="fixed bottom-4 right-4 bg-fixly-accent rounded-full p-3 shadow-lg">
        <LoadingSpinner />
      </div>
    ),
    ssr: false
  }
);

// Export all dynamic components
export {
  AdminDashboard,
  AdvancedSearch,
  LineChart,
  PieChart,
  InstagramCommentsRealtime,
  VirtualJobList,
  SkillSelector,
  FileUploadZone,
  RichTextEditor,
  DatePicker,
  MapView,
  QRCodeScanner,
  VideoCall,
  SettingsPage,
  AnalyticsDashboard,
  FeatureFlag,
  PWAInstallPrompt,
  NotificationCenter,
  SupportChat
};

// Preload functions for critical components
export const preloadCriticalComponents = () => {
  // Preload components likely to be used soon
  const criticalComponents = [
    () => import('../jobs/VirtualJobList'),
    () => import('../ui/NotificationCenter'),
    () => import('../search/AdvancedSearch'),
  ];

  // Use requestIdleCallback to preload during idle time
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      criticalComponents.forEach(preload => {
        preload().catch(() => {
          // Silent fail for preloading
        });
      });
    });
  }
};

// Component preloader hook
export const useComponentPreloader = () => {
  const preloadComponent = (componentImport) => {
    return componentImport().catch(() => {
      // Silent fail
    });
  };

  return { preloadComponent };
};