import type { AnalyticsClient, AnalyticsEvent, EventType } from './types';
import { EventTypes } from './types';

type ErrorLike = {
  message?: string;
  stack?: string;
  name?: string;
};

export class ClientAnalytics implements AnalyticsClient {
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    this.sessionId = this.generateSessionId();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        void this.flushQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  async trackEvent(
    eventType: EventType | string,
    eventData: Record<string, unknown> = {},
    context: Record<string, unknown> = {}
  ): Promise<boolean> {
    try {
      const eventProperties = {
        ...eventData,
        context: {
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          ...context,
        },
      };
      const event: AnalyticsEvent = {
        type: eventType,
        properties: eventProperties,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: typeof context.userId === 'string' ? context.userId : undefined,
      };

      if (this.isOnline) {
        const response = await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        return response.ok;
      }

      this.eventQueue.push(event);
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Analytics tracking failed';
      console.warn('Analytics tracking failed:', message);

      this.eventQueue.push({
        type: eventType,
        properties: {
          ...eventData,
          context: {
            url: typeof window !== 'undefined' ? window.location.href : '',
            error: message,
          },
        },
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: typeof context.userId === 'string' ? context.userId : undefined,
      });
      return false;
    }
  }

  async updateMetrics(
    metricName: string,
    value = 1,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    return this.trackEvent(EventTypes.USER_ACTION, {
      metric: metricName,
      value,
      metadata,
    });
  }

  async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        this.eventQueue.unshift(...events);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown queue flush error';
      console.warn('Failed to flush analytics queue:', message);
    }
  }

  trackPageView(route: string, metadata: Record<string, unknown> = {}): Promise<boolean> {
    return this.trackEvent(EventTypes.PAGE_VIEW, {
      route,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      ...metadata,
    });
  }

  trackUserAction(
    action: string,
    element: string,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    return this.trackEvent(EventTypes.USER_ACTION, {
      action,
      element,
      ...metadata,
    });
  }

  trackSearch(query: string, filters: Record<string, unknown> = {}, results = 0): Promise<boolean> {
    return this.trackEvent(EventTypes.SEARCH, {
      query,
      filters,
      results,
      timestamp: new Date().toISOString(),
    });
  }

  trackError(error: unknown, context: Record<string, unknown> = {}): Promise<boolean> {
    const normalized = (error as ErrorLike) || {};
    return this.trackEvent(EventTypes.ERROR, {
      message: normalized.message ?? 'Unknown error',
      stack: normalized.stack ?? null,
      name: normalized.name ?? 'UnknownError',
      ...context,
    });
  }

  trackPerformance(
    metric: string,
    value: number,
    context: Record<string, unknown> = {}
  ): Promise<boolean> {
    return this.trackEvent(EventTypes.PERFORMANCE, {
      metric,
      value,
      ...context,
    });
  }
}
