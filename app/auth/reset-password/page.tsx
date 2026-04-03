'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import AuthShell from '@/components/auth/AuthShell';

export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/auth/forgot-password');
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <AuthShell
      title="Reset Link Expired"
      subtitle="Request a new reset code to continue"
      badge="Password Recovery"
      footer={null}
    >
      <div className="space-y-5 text-center">
        <AlertCircle className="mx-auto h-14 w-14 text-amber-500" />
        <p className="text-sm text-fixly-text-light dark:text-gray-300">
          Password reset now uses a one-time verification code instead of a reset link.
        </p>
        <button
          onClick={() => router.replace('/auth/forgot-password')}
          className="btn-primary w-full rounded-2xl py-3"
        >
          Request New Code
        </button>
      </div>
    </AuthShell>
  );
}
