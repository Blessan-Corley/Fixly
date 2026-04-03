export type { AnalyticsClient, AnalyticsEvent, EventType } from './analytics/types';
export { EventTypes } from './analytics/types';
export { ClientAnalytics } from './analytics/ClientAnalytics';

import { ClientAnalytics } from './analytics/ClientAnalytics';
import type { AnalyticsClient } from './analytics/types';

const serverAnalytics: AnalyticsClient = {
  trackEvent: async () => false,
  updateMetrics: async () => false,
  trackPageView: async () => false,
  trackUserAction: async () => false,
  trackSearch: async () => false,
  trackError: async () => false,
  trackPerformance: async () => false,
  flushQueue: async () => {},
};

let analyticsInstance: AnalyticsClient | null = null;

export function getAnalytics(): AnalyticsClient {
  if (typeof window === 'undefined') {
    return serverAnalytics;
  }

  if (!analyticsInstance) {
    analyticsInstance = new ClientAnalytics();
  }

  return analyticsInstance;
}

export const analytics = getAnalytics();

declare global {
  interface Window {
    __fixlyAnalyticsPatched?: boolean;
  }
}

if (typeof window !== 'undefined' && !window.__fixlyAnalyticsPatched) {
  window.__fixlyAnalyticsPatched = true;

  void analytics.trackPageView(window.location.pathname);

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function pushStatePatched(...args: Parameters<History['pushState']>) {
    originalPushState(...args);
    void analytics.trackPageView(window.location.pathname);
  };

  history.replaceState = function replaceStatePatched(
    ...args: Parameters<History['replaceState']>
  ) {
    originalReplaceState(...args);
    void analytics.trackPageView(window.location.pathname);
  };

  window.addEventListener('popstate', () => {
    void analytics.trackPageView(window.location.pathname);
  });
}
