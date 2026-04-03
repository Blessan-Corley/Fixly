import { NextResponse } from 'next/server';

import { respond } from '@/lib/api';
import { createRequestLogger } from '@/lib/logger';
import { checkAllServices, type ServiceStatus } from '@/lib/resilience/serviceGuard';

export const dynamic = 'force-dynamic';

type HealthPayload = {
  status: 'ok' | 'degraded' | 'down';
  services: {
    mongo: ServiceStatus;
    redis: ServiceStatus;
    ably: ServiceStatus;
  };
  timestamp: string;
  version: string;
};

function getOverallStatus(services: HealthPayload['services']): HealthPayload['status'] {
  if (!services.mongo.available) {
    return 'down';
  }

  if (Object.values(services).every((service) => service.available)) {
    return 'ok';
  }

  return 'degraded';
}

function getStatusCode(status: HealthPayload['status']): number {
  return status === 'down' ? 503 : 200;
}

export async function GET(): Promise<NextResponse<HealthPayload>> {
  const requestLogger = createRequestLogger(
    `health_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    undefined,
    '/api/health'
  );

  try {
    const services = await checkAllServices();
    const payload: HealthPayload = {
      status: getOverallStatus(services),
      services,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
    };

    requestLogger.info({ payload }, 'Health check completed');
    return respond(payload, getStatusCode(payload.status));
  } catch (error: unknown) {
    const payload: HealthPayload = {
      status: 'down',
      services: {
        mongo: { available: false, error: 'Health check failed' },
        redis: { available: false, error: 'Health check failed' },
        ably: { available: false, error: 'Health check failed' },
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
    };

    requestLogger.error({ error }, 'Health check failed unexpectedly');
    return respond(payload, 503);
  }
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
