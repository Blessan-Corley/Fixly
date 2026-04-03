import { NextRequest } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';

import { badRequest } from '@/lib/api/response';

export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: ReturnType<typeof badRequest> }> {
  try {
    const body = (await req.json()) as unknown;
    const data = schema.parse(body);
    return { data };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return {
        error: badRequest('Validation failed', error.flatten().fieldErrors),
      };
    }
    return { error: badRequest('Invalid request body') };
  }
}

export function parseQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): { data: T } | { error: ReturnType<typeof badRequest> } {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const data = schema.parse(params);
    return { data };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return {
        error: badRequest('Invalid query parameters', error.flatten().fieldErrors),
      };
    }
    return { error: badRequest('Invalid query parameters') };
  }
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export function parsePagination(req: NextRequest): PaginationParams {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  return paginationSchema.parse(params);
}
