export const EventTypes = {
  PAGE_VIEW: 'page_view',
  USER_ACTION: 'user_action',
  JOB_INTERACTION: 'job_interaction',
  SEARCH: 'search',
  ERROR: 'error',
  PERFORMANCE: 'performance',
  API_ERROR: 'api_error',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export type AnalyticsEvent = {
  type: EventType | string;
  properties: Record<string, unknown>;
  timestamp: number;
  sessionId?: string;
  userId?: string;
};

export interface AnalyticsClient {
  trackEvent: (
    eventType: EventType | string,
    eventData?: Record<string, unknown>,
    context?: Record<string, unknown>
  ) => Promise<boolean>;
  updateMetrics: (
    metricName: string,
    value?: number,
    metadata?: Record<string, unknown>
  ) => Promise<boolean>;
  trackPageView: (route: string, metadata?: Record<string, unknown>) => Promise<boolean>;
  trackUserAction: (
    action: string,
    element: string,
    metadata?: Record<string, unknown>
  ) => Promise<boolean>;
  trackSearch: (
    query: string,
    filters?: Record<string, unknown>,
    results?: number
  ) => Promise<boolean>;
  trackError: (error: unknown, context?: Record<string, unknown>) => Promise<boolean>;
  trackPerformance: (
    metric: string,
    value: number,
    context?: Record<string, unknown>
  ) => Promise<boolean>;
  flushQueue: () => Promise<void>;
}
