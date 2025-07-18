// app/admin/page.js
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Loader } from 'lucide-react';

export default function AdminRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user?.role === 'admin') {
      // User is already logged in as admin, redirect to admin dashboard
      router.push('/dashboard/admin');
    } else if (session) {
      // User is logged in but not admin
      router.push('/dashboard?error=admin_required');
    } else {
      // User not logged in, redirect to signin with admin context
      router.push('/auth/signin?admin=true');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-fixly-accent rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-fixly-text" />
        </div>
        <h2 className="text-xl font-semibold text-fixly-text mb-2">
          Admin Access
        </h2>
        <p className="text-fixly-text-muted mb-4">
          Redirecting to admin login...
        </p>
        <Loader className="animate-spin h-6 w-6 text-fixly-accent mx-auto" />
      </div>
    </div>
  );
}