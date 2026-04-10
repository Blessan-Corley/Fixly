'use client';

import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { clearSignupDraft, writeSignupDraft } from '@/lib/signup-draft';
import type { UserRole } from '@/types/User';

import { buildSignupDraft } from '../_lib/signup.flow';
import type { SignupErrors, SignupFormData, SignupStep } from '../_lib/signup.types';

type UseSignupSubmitOptions = {
  formData: SignupFormData;
  currentStep: SignupStep;
  errors: SignupErrors;
  postSignupRedirect: string;
  setErrors: (errors: SignupErrors) => void;
  setLoading: (value: boolean) => void;
  validateCurrentStep: (step: SignupStep) => boolean;
};

type UseSignupSubmitReturn = {
  handleGoogleAuth: () => Promise<void>;
  submitSignup: () => Promise<void>;
};

export function useSignupSubmit({
  formData,
  currentStep,
  errors,
  postSignupRedirect,
  setErrors,
  setLoading,
  validateCurrentStep,
}: UseSignupSubmitOptions): UseSignupSubmitReturn {
  const router = useRouter();
  const { data: sessionData, update } = useSession();

  const handleGoogleAuth = useCallback(async () => {
    if (!formData.role) {
      return setErrors({ ...errors, role: 'Choose whether you are joining as a hirer or fixer.' });
    }
    setLoading(true);
    try {
      writeSignupDraft(buildSignupDraft({ ...formData, authMethod: 'google' }, currentStep));
      await fetch('/api/auth/set-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'signup' }),
      });
      await signIn('google', { callbackUrl: `/auth/signup?role=${formData.role}&method=google` });
    } catch (error) {
      console.error('Google auth failed:', error);
      toast.error('Google authentication failed. Please try again.');
      setLoading(false);
    }
  }, [currentStep, errors, formData, setErrors, setLoading]);

  const submitSignup = useCallback(async () => {
    if (!validateCurrentStep('verification')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          authMethod: formData.authMethod,
          isGoogleCompletion: formData.authMethod === 'google',
          location: {
            homeAddress: {
              formattedAddress:
                formData.address?.formattedAddress || formData.address?.formatted || '',
            },
            currentLocation: {
              lat: formData.address?.coordinates?.lat ?? 0,
              lng: formData.address?.coordinates?.lng ?? 0,
              source: 'manual',
            },
          },
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        errors?: string[];
        user?: {
          id?: string;
          role?: UserRole;
          username?: string;
          isVerified?: boolean;
        };
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.errors?.[0] ?? payload.message ?? 'Unable to create your account.');
      }
      clearSignupDraft();
      if (formData.authMethod === 'email') {
        await signIn('credentials', {
          identifier: formData.email,
          password: formData.password,
          loginMethod: 'credentials',
          callbackUrl: '/dashboard',
        });
        return;
      }
      if (sessionData?.user) {
        await update({
          ...sessionData,
          user: {
            ...sessionData.user,
            id: payload.user?.id ?? sessionData.user.id,
            role: payload.user?.role ?? formData.role,
            username: payload.user?.username ?? formData.username,
            phone: formData.phone,
            authMethod: 'google',
            isRegistered: true,
            needsOnboarding: false,
            isVerified: payload.user?.isVerified === true,
            emailVerified: true,
            phoneVerified: false,
          },
        });
      }
      toast.success('Your Fixly account is ready.');
      router.push(postSignupRedirect);
    } catch (error) {
      console.error('Signup submit error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Unable to create your account right now.'
      );
    } finally {
      setLoading(false);
    }
  }, [formData, postSignupRedirect, router, sessionData, setLoading, update, validateCurrentStep]);

  return { handleGoogleAuth, submitSignup };
}
