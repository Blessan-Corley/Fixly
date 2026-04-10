'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useReducer } from 'react';


import { getNextStep, getPreviousStep, getVisibleSteps, validateStep } from '../_lib/signup.flow';
import { createState, initialFormData, reducer } from '../_lib/signup.reducer';
import type { SignupErrors, SignupFormData, SignupStep } from '../_lib/signup.types';

import { useEmailOtp } from './useEmailOtp';
import { useSignupDraft } from './useSignupDraft';
import { useSignupSubmit } from './useSignupSubmit';


export interface SignupPageHook {
  formData: SignupFormData;
  currentStep: SignupStep;
  errors: SignupErrors;
  isLoading: boolean;
  completedSteps: SignupStep[];
  visibleSteps: SignupStep[];
  otp: ReturnType<typeof useEmailOtp>;
  canContinue: boolean;
  handleChange: <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => void;
  handleContinue: () => Promise<void>;
  goBack: () => void;
  selectedRole: 'hirer' | 'fixer' | undefined;
}

export function useSignupPage(): SignupPageHook {
  const searchParams = useSearchParams();

  const selectedRole = useMemo(() => {
    const role = searchParams?.get('role');
    return role === 'hirer' || role === 'fixer' ? role : undefined;
  }, [searchParams]);

  const postSignupRedirect = useMemo(() => {
    const cb = searchParams?.get('callbackUrl');
    if (cb && cb.startsWith('/') && !cb.startsWith('//')) return cb;
    return '/dashboard';
  }, [searchParams]);

  const [state, dispatch] = useReducer(reducer, selectedRole, createState);
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

  const otp = useEmailOtp({ formData, setErrors });

  const handleChange = useCallback(
    <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => {
      applyFormData({ [field]: value } as Partial<SignupFormData>);
      if (field === 'email') otp.resetOtpState();
      if (errors[field]) setErrors({ ...errors, [field]: '' });
    },
    [applyFormData, errors, otp, setErrors]
  );

  const validateCurrentStep = useCallback(
    (step: SignupStep) => {
      const result = validateStep(step, formData);
      const nextErrors = { ...result.errors };
      if (step === 'account' && formData.authMethod === 'email' && !otp.emailOtpVerified) {
        nextErrors.emailOtp = 'Verify your email address before continuing';
      }
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    },
    [otp.emailOtpVerified, formData, setErrors]
  );

  const visibleSteps = useMemo(
    () => getVisibleSteps(formData.authMethod),
    [formData.authMethod]
  );

  const canContinue = useMemo(() => {
    if (currentStep === 'role') return validateStep('role', formData).valid;
    if (currentStep === 'account') {
      if (formData.authMethod !== 'email') return true;
      return otp.canSendEmailOtp && otp.emailOtpVerified;
    }
    return validateStep(currentStep, formData).valid;
  }, [otp.canSendEmailOtp, otp.emailOtpVerified, currentStep, formData]);

  useSignupDraft({
    formData,
    currentStep,
    initialRole: selectedRole,
    dispatch,
    initialFormData,
  });

  const { handleGoogleAuth, submitSignup } = useSignupSubmit({
    formData,
    currentStep,
    errors,
    postSignupRedirect,
    setErrors,
    setLoading,
    validateCurrentStep,
  });

  useEffect(() => {
    if (selectedRole) applyFormData({ role: selectedRole });
  }, [applyFormData, selectedRole]);

  const handleContinue = useCallback(async () => {
    if (!validateCurrentStep(currentStep)) return;
    if (currentStep === 'role' && formData.authMethod === 'google') return handleGoogleAuth();
    if (currentStep === 'verification') return submitSignup();
    dispatch({ type: 'COMPLETE_STEP', step: currentStep });
    dispatch({ type: 'SET_STEP', step: getNextStep(currentStep, formData.authMethod) });
  }, [currentStep, formData.authMethod, handleGoogleAuth, submitSignup, validateCurrentStep]);

  const goBack = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: getPreviousStep(currentStep, formData.authMethod) });
  }, [currentStep, formData.authMethod]);

  return {
    formData,
    currentStep,
    errors,
    isLoading,
    completedSteps,
    visibleSteps,
    otp,
    canContinue,
    handleChange,
    handleContinue,
    goBack,
    selectedRole,
  };
}
