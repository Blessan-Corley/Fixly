'use client';

import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const signInSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email address or username'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

const signInResolver: Resolver<SignInFormData> = async (values) => {
  const parsed = signInSchema.safeParse(values);
  if (parsed.success) return { values: parsed.data, errors: {} };

  const fieldErrors: FieldErrors<SignInFormData> = {};
  parsed.error.issues.forEach((issue) => {
    const path = issue.path[0];
    if (typeof path !== 'string') return;
    const field = path as keyof SignInFormData;
    fieldErrors[field] = { type: issue.code, message: issue.message };
  });

  return { values: {} as Record<string, never>, errors: fieldErrors };
};

export type SignInPageState = ReturnType<typeof useSignInPage>;

export function useSignInPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error] = useQueryState('error', parseAsString);
  const [message] = useQueryState('message', parseAsString);
  const [suggestedEmail] = useQueryState('email', parseAsString.withDefault(''));
  const [role] = useQueryState('role', parseAsString.withDefault('fixer'));

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SignInFormData>({
    resolver: signInResolver,
    defaultValues: { identifier: suggestedEmail, password: '' },
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    if (
      session?.user?.isRegistered &&
      session.user.role &&
      !session.user.username?.startsWith('temp_')
    ) {
      router.replace('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    if (error) {
      switch (error) {
        case 'CredentialsSignin':
          toast.error('Sign-in failed. Check your credentials and try again.');
          break;
        case 'OAuthCallback':
          toast.error('Google authentication failed. Please try again.');
          break;
        case 'AccessDenied':
          toast.error('Access denied. Your account may be suspended.');
          break;
        default:
          toast.error('Authentication error. Please try again.');
          break;
      }
    }
    if (message === 'signup_complete') {
      toast.success('Your Fixly account is ready. Sign in to continue.');
    } else if (message === 'password_reset_success') {
      toast.success('Password updated successfully. Sign in with your new password.');
    }
  }, [error, message]);

  useEffect(() => {
    setValue('identifier', suggestedEmail);
  }, [setValue, suggestedEmail]);

  const handleEmailSignIn = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        identifier: data.identifier.trim().toLowerCase(),
        password: data.password,
        loginMethod: 'credentials',
        redirect: false,
      });
      if (result?.error) {
        if (result.error === 'AUTH_RATE_LIMITED') {
          toast.error('Too many failed attempts. Please wait 15 minutes or reset your password.');
        } else if (result.error === 'AUTH_TEMPORARILY_UNAVAILABLE') {
          toast.error('Sign-in is temporarily unavailable. Please try again shortly.');
        } else if (result.error === 'AUTH_ACCESS_DENIED') {
          toast.error('Access denied. If you believe this is a mistake, contact support.');
        } else {
          toast.error('Unable to sign in with those details. Check your credentials and try again.');
        }
        return;
      }
      toast.success('Welcome back to Fixly.');
      router.push('/dashboard');
    } catch (signinError) {
      console.error('Email signin error:', signinError);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  const handleGoogleSignIn = async (): Promise<void> => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      await fetch('/api/auth/set-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'signin' }),
      });
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (googleError) {
      console.error('Google signin error:', googleError);
      toast.error('Google authentication failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return {
    error,
    role,
    register,
    errors,
    loading,
    googleLoading,
    showPassword,
    setShowPassword,
    handleEmailSignIn,
    handleGoogleSignIn,
    router,
  };
}
