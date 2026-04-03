import type { JobRouteContext } from '../route.shared';

import { handleGet } from './handlers/get';
import { handlePut } from './handlers/put';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, context: JobRouteContext): Promise<Response> {
  return handlePut(request, context);
}

export async function GET(request: Request, context: JobRouteContext): Promise<Response> {
  return handleGet(request, context);
}
