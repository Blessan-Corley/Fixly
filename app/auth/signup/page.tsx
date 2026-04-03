'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';

import AuthShell from '@/components/auth/AuthShell';
import {
  clearSignupDraft,
  hasSignupDraftContent,
  readSignupDraft,
  writeSignupDraft,
} from '@/lib/signup-draft';
import { signupStep2Schema } from '@/lib/validations/auth';
import type { AuthMethod, UserRole } from '@/types/User';

import { AccountStep } from './_components/AccountStep';
import { ProfileStep } from './_components/ProfileStep';
import { RoleStep } from './_components/RoleStep';
import { StepProgress } from './_components/StepProgress';
import { VerificationStep } from './_components/VerificationStep';
import {
  buildSignupDraft,
  draftStepToSignupStep,
  getCompletedSteps,
  getNextStep,
  getPreviousStep,
  isTemporaryUsername,
  SIGNUP_STEPS,
  validateStep,
} from './_lib/signup.flow';
import type {
  SignupAction,
  SignupErrors,
  SignupFlowState,
  SignupFormData,
  SignupStep,
} from './_lib/signup.types';

const initialFormData = (role?: UserRole): SignupFormData => ({
  role,
  authMethod: '',
  name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  address: null,
  skills: [],
  termsAccepted: false,
});

const createState = (role?: UserRole): SignupFlowState => ({
  currentStep: 'role',
  formData: initialFormData(role),
  errors: {},
  isLoading: false,
  completedSteps: [],
});

const reducer = (state: SignupFlowState, action: SignupAction): SignupFlowState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SET_LOADING':
      return { ...state, isLoading: action.value };
    case 'PATCH_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.data } };
    case 'COMPLETE_STEP':
      return {
        ...state,
        completedSteps: state.completedSteps.includes(action.step)
          ? state.completedSteps
          : [...state.completedSteps, action.step],
      };
    default:
      return {
        ...state,
        ...action.state,
        formData: { ...state.formData, ...action.state.formData },
      };
  }
};

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: sessionData, update } = useSession();

  const selectedRole = useMemo(() => {
    const role = searchParams?.get('role');
    return role === 'hirer' || role === 'fixer' ? role : undefined;
  }, [searchParams]);

  const [state, dispatch] = useReducer(reducer, selectedRole, createState);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { formData, currentStep, errors, isLoading, completedSteps } = state;

  const setErrors = useCallback(
    (next: SignupErrors) => dispatch({ type: 'SET_ERRORS', errors: next }),
    []
  );
  const setLoading = useCallback(
    (value: boolean) => dispatch({ type: 'SET_LOADING', value }),
    []
  );
  const applyFormData = useCallback(
    (data: Partial<SignupFormData>) => dispatch({ type: 'PATCH_FORM_DATA', data }),
    []
  );

  const handleChange = useCallback(
    <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => {
      applyFormData({ [field]: value } as Partial<SignupFormData>);
      if (field === 'email') {
        setEmailOtp('');
        setEmailOtpSent(false);
        setEmailOtpVerified(false);
        setOtpError('');
        setResendCooldown(0);
      }
      if (errors[field]) setErrors({ ...errors, [field]: '' });
    },
    [applyFormData, errors, setErrors]
  );

  const validateCurrentStep = useCallback(
    (step: SignupStep) => {
      const result = validateStep(step, formData);
      const nextErrors = { ...result.errors };
      if (step === 'account' && formData.authMethod === 'email' && !emailOtpVerified) {
        nextErrors.emailOtp = 'Verify your email address before continuing';
      }
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    },
    [emailOtpVerified, formData, setErrors]
  );

  const startResendCountdown = useCallback((seconds: number) => {
    setResendCooldown(seconds);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((value) => {
        if (value <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          resendTimerRef.current = null;
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }, []);

  const canSendEmailOtp = useMemo(
    () =>
      signupStep2Schema.safeParse({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      }).success,
    [formData.confirmPassword, formData.email, formData.password]
  );

  const canContinue = useMemo(() => {
    if (currentStep === 'role') return validateStep('role', formData).valid;
    if (currentStep === 'account') {
      return formData.authMethod === 'email' && canSendEmailOtp && emailOtpVerified;
    }
    return validateStep(currentStep, formData).valid;
  }, [canSendEmailOtp, currentStep, emailOtpVerified, formData]);

  useEffect(() => {
    if (selectedRole) applyFormData({ role: selectedRole });
  }, [applyFormData, selectedRole]);

  useEffect(
    () => () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!hasCheckedSession) return;
    const draft = buildSignupDraft(formData, currentStep);
    if (hasSignupDraftContent(draft)) writeSignupDraft(draft);
    else clearSignupDraft();
  }, [currentStep, formData, hasCheckedSession]);

  useEffect(() => {
    const checkExistingUser = async () => {
      if (hasCheckedSession) return;
      try {
        const draft = readSignupDraft();
        const session = sessionData;

        if (!session?.user) {
          if (draft) {
            const restoredStep =
              draft.authMethod === 'email' && draft.currentStep > 2
                ? 'account'
                : draftStepToSignupStep(draft.currentStep);
            dispatch({
              type: 'HYDRATE',
              state: {
                currentStep: restoredStep,
                completedSteps: getCompletedSteps(restoredStep),
                formData: {
                  ...initialFormData(state.formData.role),
                  ...draft.formData,
                  authMethod: draft.authMethod,
                  role: draft.formData.role ?? state.formData.role,
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
              completedSteps: getCompletedSteps(restoredStep),
              formData: {
                ...initialFormData(
                  (session.user.role as UserRole | undefined) ??
                    draft?.formData.role ??
                    state.formData.role
                ),
                ...draft?.formData,
                authMethod: 'google',
                role:
                  (session.user.role as UserRole | undefined) ??
                  draft?.formData.role ??
                  state.formData.role,
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
              completedSteps: getCompletedSteps(restoredStep),
              formData: {
                ...initialFormData(state.formData.role),
                ...draft.formData,
                authMethod: draft.authMethod,
                role: draft.formData.role ?? state.formData.role,
              },
            },
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setHasCheckedSession(true);
      }
    };
    void checkExistingUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheckedSession, router, sessionData, state.formData.role]);

  const sendEmailOtp = useCallback(async () => {
    const result = validateStep('account', formData);
    if (!result.valid) return setErrors(result.errors);
    setOtpLoading(true);
    setOtpError('');
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || 'Fixly User',
          purpose: 'signup',
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to send verification code.');
      setEmailOtpSent(true);
      setEmailOtpVerified(false);
      startResendCountdown(60);
      toast.success('Verification code sent to your email.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to send verification code right now.';
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  }, [formData, setErrors, startResendCountdown]);

  const verifyEmailOtp = useCallback(async () => {
    if (emailOtp.length !== 6) return setOtpError('Enter the 6-digit code sent to your email.');
    setOtpLoading(true);
    setOtpError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: emailOtp, purpose: 'signup' }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Invalid verification code.');
      setEmailOtpVerified(true);
      toast.success('Email verified. Continue with your profile.');
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Unable to verify the code right now.');
    } finally {
      setOtpLoading(false);
    }
  }, [emailOtp, formData.email]);

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
        throw new Error(payload.errors?.[0] || payload.message || 'Unable to create your account.');
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
            googleId: sessionData.user.googleId,
          },
        });
      }
      toast.success('Your Fixly account is ready.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup submit error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Unable to create your account right now.'
      );
    } finally {
      setLoading(false);
    }
  }, [formData, router, sessionData, setLoading, update, validateCurrentStep]);

  const handleContinue = useCallback(async () => {
    if (!validateCurrentStep(currentStep)) return;
    if (currentStep === 'role' && formData.authMethod === 'google') return handleGoogleAuth();
    if (currentStep === 'verification') return submitSignup();
    dispatch({ type: 'COMPLETE_STEP', step: currentStep });
    dispatch({ type: 'SET_STEP', step: getNextStep(currentStep, formData.role ?? '') });
  }, [currentStep, formData.authMethod, formData.role, handleGoogleAuth, submitSignup, validateCurrentStep]);

  const stepContent =
    currentStep === 'role' ? (
      <RoleStep
        role={formData.role}
        authMethod={formData.authMethod}
        error={errors.role}
        authMethodError={errors.authMethod}
        isLoading={isLoading}
        onSelect={(role) => handleChange('role', role)}
        onAuthMethodSelect={(method) => handleChange('authMethod', method as AuthMethod)}
      />
    ) : currentStep === 'account' ? (
      <AccountStep
        formData={formData}
        errors={errors}
        isLoading={isLoading}
        otpLoading={otpLoading}
        emailOtp={emailOtp}
        emailOtpSent={emailOtpSent}
        emailOtpVerified={emailOtpVerified}
        otpError={otpError}
        resendCooldown={resendCooldown}
        canSendEmailOtp={canSendEmailOtp}
        onChange={handleChange}
        onEmailOtpChange={setEmailOtp}
        onSendEmailOtp={sendEmailOtp}
        onVerifyEmailOtp={verifyEmailOtp}
      />
    ) : currentStep === 'profile' ? (
      <ProfileStep
        formData={formData}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
      />
    ) : (
      <VerificationStep
        formData={formData}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
      />
    );

  const roleLabel =
    formData.role === 'fixer' ? 'Fixer' : formData.role === 'hirer' ? 'Hirer' : '';

  return (
    <AuthShell
      title={roleLabel ? `Welcome ${roleLabel}` : 'Welcome to Fixly'}
      subtitle="Create your account"
      badge={roleLabel ? `${roleLabel} Signup` : 'Create Account'}
      footer={
        <p>
          Already a Fixly user?{' '}
          <button
            type="button"
            onClick={() => router.push(`/auth/signin?role=${formData.role ?? 'fixer'}`)}
            className="font-semibold text-fixly-accent transition-colors hover:text-fixly-accent-dark"
          >
            Sign in instead
          </button>
        </p>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleContinue();
        }}
        className="space-y-6"
      >
        <StepProgress
          steps={SIGNUP_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {stepContent}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          {currentStep !== 'role' ? (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'SET_STEP', step: getPreviousStep(currentStep) })
              }
              className="btn-ghost rounded-2xl px-5 py-3"
              disabled={isLoading}
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={isLoading || !canContinue}
            className="btn-primary rounded-2xl px-5 py-3"
          >
            {isLoading ? <Loader className="mr-2 inline h-4 w-4 animate-spin" /> : null}
            {currentStep === 'verification' ? 'Create account' : 'Continue'}
            {currentStep !== 'verification' && <ArrowRight className="ml-2 inline h-4 w-4" />}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageContent />
    </Suspense>
  );
}
