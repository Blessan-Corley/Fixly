'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import type { IncompleteSignupNotice } from '@/components/landing/landing.types';
import { hasIncompleteSignupSession } from '@/components/landing/landing.utils';
import LandingCta from '@/components/landing/LandingCta';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingFooter from '@/components/landing/LandingFooter';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingStats from '@/components/landing/LandingStats';
import { closeAblyClient } from '@/lib/ably';
import {
  clearSignupDraft,
  hasSignupDraftContent,
  readSignupDraft,
} from '@/lib/signup-draft';

const ResumeSignupBanner = dynamic(() => import('@/components/landing/ResumeSignupBanner'), {
  ssr: false,
});
const RoleSelectionModal = dynamic(() => import('@/components/landing/RoleSelectionModal'), {
  ssr: false,
});

export default function LandingPageClient() {
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [resumeSignupNotice, setResumeSignupNotice] = useState<IncompleteSignupNotice | null>(
    null
  );
  const [isResettingSignup, setIsResettingSignup] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session && !hasIncompleteSignupSession(session)) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'loading') return;

    const draft = readSignupDraft();
    const hasDraft = hasSignupDraftContent(draft);
    const hasPendingSession = hasIncompleteSignupSession(session ?? null);

    if (status === 'authenticated' && session && !hasPendingSession) {
      setResumeSignupNotice(null);
      return;
    }

    if (hasPendingSession || hasDraft) {
      setResumeSignupNotice({ hasPendingSession, draft: hasDraft ? draft : null });
      return;
    }

    setResumeSignupNotice(null);
  }, [session, status]);

  const getResumeSignupUrl = (): string => {
    const params = new URLSearchParams();
    const role =
      resumeSignupNotice?.draft?.formData.role ??
      (session?.user?.role === 'hirer' || session?.user?.role === 'fixer'
        ? session.user.role
        : '');
    const method =
      resumeSignupNotice?.draft?.authMethod ??
      (session?.user?.authMethod === 'email' || session?.user?.authMethod === 'google'
        ? session.user.authMethod
        : '');

    if (role) params.set('role', role);
    if (method) params.set('method', method);

    const query = params.toString();
    return query ? `/auth/signup?${query}` : '/auth/signup';
  };

  const handleContinueSignup = (): void => {
    const role = resumeSignupNotice?.draft?.formData.role;
    if (role) sessionStorage.setItem('selectedRole', role);
    router.push(getResumeSignupUrl());
  };

  const handleStartOverSignup = async (): Promise<void> => {
    setIsResettingSignup(true);
    clearSignupDraft();
    sessionStorage.removeItem('selectedRole');
    setResumeSignupNotice(null);

    try {
      if (status === 'authenticated' && hasIncompleteSignupSession(session ?? null)) {
        closeAblyClient();
        await signOut({ redirect: false });
      }
    } finally {
      setIsResettingSignup(false);
      router.push('/auth/signup');
      router.refresh();
    }
  };

  const handleRoleSelect = (role: 'hirer' | 'fixer'): void => {
    if (resumeSignupNotice) {
      clearSignupDraft();
      setResumeSignupNotice(null);
    }
    sessionStorage.setItem('selectedRole', role);
    router.push(`/auth/signup?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      <LandingHeader onGetStarted={() => setShowRoleSelection(true)} />
      <LandingHero
        onHireService={() => handleRoleSelect('hirer')}
        onProvideService={() => handleRoleSelect('fixer')}
      />
      <LandingStats />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingCta
        onPostJob={() => handleRoleSelect('hirer')}
        onBecomeFixer={() => handleRoleSelect('fixer')}
      />
      <LandingFooter
        onPostJob={() => handleRoleSelect('hirer')}
        onBecomeFixer={() => handleRoleSelect('fixer')}
      />

      {resumeSignupNotice && (
        <ResumeSignupBanner
          notice={resumeSignupNotice}
          isResetting={isResettingSignup}
          onContinue={handleContinueSignup}
          onStartOver={() => void handleStartOverSignup()}
          onDismiss={() => setResumeSignupNotice(null)}
        />
      )}

      {showRoleSelection && (
        <RoleSelectionModal
          onSelect={handleRoleSelect}
          onClose={() => setShowRoleSelection(false)}
        />
      )}
    </div>
  );
}
