// Phase 2: Added an authenticated CSRF token endpoint for client-side mutation setup.
import { requireSession } from '@/lib/api/auth';
import { apiSuccess } from '@/lib/api/response';
import { getCsrfToken } from '@/lib/security/csrf.server';

export async function GET() {
  const auth = await requireSession();
  if ('error' in auth) {
    return auth.error;
  }

  const csrfToken = getCsrfToken(auth.session);
  if (!csrfToken) {
    return Response.json(
      {
        error: 'CSRF token unavailable',
      },
      { status: 500 }
    );
  }

  return apiSuccess({ csrfToken });
}
