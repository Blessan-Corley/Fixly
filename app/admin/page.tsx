'use client';

import { Shield, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function AdminRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (session?.user?.role === 'admin') {
      router.push('/dashboard/admin');
      return;
    }

    if (session) {
      router.push('/dashboard?error=admin_required');
      return;
    }

    router.push('/auth/signin?admin=true');
  }, [router, session, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-fixly-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent">
          <Shield className="h-8 w-8 text-fixly-text" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-fixly-text">Admin Access</h2>
        <p className="mb-4 text-fixly-text-muted">Redirecting to admin login...</p>
        <Loader className="mx-auto h-6 w-6 animate-spin text-fixly-accent" />
      </div>
    </div>
  );
}
