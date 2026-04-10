'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  clearSignupDraft,
  hasSignupDraftContent,
  readSignupDraft,
  writeSignupDraft,
} from '@/lib/signup-draft';
import type { UserRole } from '@/types/User';

import {
  buildSignupDraft,
  draftStepToSignupStep,
  getCompletedSteps,
  isTemporaryUsername,
} from '../_lib/signup.flow';
import type { SignupFlowState, SignupFormData } from '../_lib/signup.types';

type HydrateAction = {
  type: 'HYDRATE';
  state: Partial<SignupFlowState> & { formData?: Partial<SignupFormData> };
};

type UseSignupDraftOptions = {
  formData: SignupFormData;
  currentStep: SignupFlowState['currentStep'];
  initialRole: UserRole | undefined;
  dispatch: (action: HydrateAction) => void;
  initialFormData: (role?: UserRole) => SignupFormData;
};

export function useSignupDraft({
  formData,
  currentStep,
  initialRole,
  dispatch,
  initialFormData,
}: UseSignupDraftOptions): { hasCheckedSession: boolean } {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // Persist draft on every form change (after session check completes)
  useEffect(() => {
    if (!hasCheckedSession) return;
    const draft = buildSignupDraft(formData, currentStep);
    if (hasSignupDraftContent(draft)) writeSignupDraft(draft);
    else clearSignupDraft();
  }, [currentStep, formData, hasCheckedSession]);

  // On mount: restore draft or redirect if already registered
  const checkExistingUser = useCallback(async () => {
    if (hasCheckedSession) return;
    try {
      const draft = readSignupDraft();
      const session = sessionData;

      if (!session?.user) {
        if (draft) {
          // Google users without an active OAuth session must re-authenticate from the start.
          const restoredStep =
            draft.authMethod === 'google'
              ? 'role'
              : draft.authMethod === 'email' && draft.currentStep > 2
                ? 'account'
                : draftStepToSignupStep(draft.currentStep);
          dispatch({
            type: 'HYDRATE',
            state: {
              currentStep: restoredStep,
              completedSteps: getCompletedSteps(restoredStep, draft.authMethod),
              formData: {
                ...initialFormData(initialRole),
                ...draft.formData,
                authMethod: draft.authMethod === 'google' ? '' : draft.authMethod,
                role: draft.formData.role ?? initialRole,
              },
            },
          });
          if (draft.authMethod === 'email' && draft.currentStep > 2) {
            toast.info(
              'We restored your saved details. Re-enter your password and verify email to continue.'
            );
          }
        }
        return;
      }

      if (session.user.isRegistered && session.user.role && session.user.username) {
        clearSignupDraft();
        router.replace('/dashboard');
        return;
      }

      if (session.user.authMethod === 'google' && session.user.email) {
        const fallbackUsername = session.user.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);
        const restoredStep =
          draft?.authMethod === 'google' && draft.currentStep === 4 ? 'verification' : 'profile';
        dispatch({
          type: 'HYDRATE',
          state: {
            currentStep: restoredStep,
            completedSteps: getCompletedSteps(restoredStep, 'google'),
            formData: {
              ...initialFormData(
                (session.user.role as UserRole | undefined) ??
                  draft?.formData.role ??
                  initialRole
              ),
              ...draft?.formData,
              authMethod: 'google',
              role:
                (session.user.role as UserRole | undefined) ??
                draft?.formData.role ??
                initialRole,
              email: session.user.email ?? '',
              name: session.user.name ?? '',
              username:
                session.user.username && !isTemporaryUsername(session.user.username)
                  ? session.user.username
                  : (draft?.formData.username ?? fallbackUsername),
              phone: session.user.phone ?? draft?.formData.phone ?? '',
            },
          },
        });
        return;
      }

      if (draft) {
        const restoredStep =
          draft.authMethod === 'email' && draft.currentStep > 2
            ? 'account'
            : draftStepToSignupStep(draft.currentStep);
        dispatch({
          type: 'HYDRATE',
          state: {
            currentStep: restoredStep,
            completedSteps: getCompletedSteps(restoredStep, draft.authMethod),
            formData: {
              ...initialFormData(initialRole),
              ...draft.formData,
              authMethod: draft.authMethod,
              role: draft.formData.role ?? initialRole,
            },
          },
        });
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setHasCheckedSession(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheckedSession, router, sessionData, initialRole]);

  useEffect(() => {
    void checkExistingUser();
  }, [checkExistingUser]);

  return { hasCheckedSession };
}
