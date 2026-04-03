import type { ZodSchema } from 'zod';

import type { SignupDraft } from '@/lib/signup-draft';
import {
  signupStep1Schema,
  signupStep2Schema,
  signupStep3Schema,
  signupStep4Schema,
} from '@/lib/validations/auth';

import type { SignupErrors, SignupFormData, SignupStep, StepValidationResult } from './signup.types';

const signupStep1RoleSchema = signupStep1Schema.refine((data) => Boolean(data.role), {
  message: 'Select whether you are joining as a hirer or fixer.',
  path: ['role'],
});

export const SIGNUP_STEPS: SignupStep[] = ['role', 'account', 'profile', 'verification'];

export function getNextStep(currentStep: SignupStep, _role: string = ''): SignupStep {
  const currentIndex = SIGNUP_STEPS.indexOf(currentStep);
  return SIGNUP_STEPS[Math.min(currentIndex + 1, SIGNUP_STEPS.length - 1)];
}

export function getPreviousStep(currentStep: SignupStep): SignupStep {
  const currentIndex = SIGNUP_STEPS.indexOf(currentStep);
  return SIGNUP_STEPS[Math.max(currentIndex - 1, 0)];
}

export function getStepValidationSchema(step: SignupStep): ZodSchema {
  switch (step) {
    case 'role':
      return signupStep1RoleSchema;
    case 'account':
      return signupStep2Schema;
    case 'profile':
      return signupStep3Schema;
    case 'verification':
      return signupStep4Schema;
  }
}

export function getStepPayload(step: SignupStep, formData: SignupFormData): unknown {
  switch (step) {
    case 'role':
      return { authMethod: formData.authMethod, role: formData.role };
    case 'account':
      return {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };
    case 'profile':
      return { name: formData.name, username: formData.username, phone: formData.phone };
    case 'verification':
      return {
        address: formData.address,
        role: formData.role,
        skills: formData.skills,
        termsAccepted: formData.termsAccepted,
      };
  }
}

export function validateStep(step: SignupStep, formData: SignupFormData): StepValidationResult {
  const parsed = getStepValidationSchema(step).safeParse(getStepPayload(step, formData));
  if (parsed.success) {
    return { valid: true, errors: {} };
  }

  const errors = parsed.error.issues.reduce<SignupErrors>((accumulator, issue) => {
    const key =
      typeof issue.path[0] === 'string' ? (issue.path[0] as keyof SignupErrors) : 'form';
    accumulator[key] = issue.message;
    return accumulator;
  }, {});

  return { valid: false, errors };
}

export function isStepComplete(step: SignupStep, formData: SignupFormData): boolean {
  return validateStep(step, formData).valid;
}

export function draftStepToSignupStep(step: SignupDraft['currentStep']): SignupStep {
  switch (step) {
    case 1:
      return 'role';
    case 2:
      return 'account';
    case 3:
      return 'profile';
    case 4:
    default:
      return 'verification';
  }
}

export function signupStepToDraftStep(step: SignupStep): SignupDraft['currentStep'] {
  switch (step) {
    case 'role':
      return 1;
    case 'account':
      return 2;
    case 'profile':
      return 3;
    case 'verification':
    default:
      return 4;
  }
}

export function buildSignupDraft(formData: SignupFormData, currentStep: SignupStep): SignupDraft {
  return {
    version: 1,
    authMethod: formData.authMethod,
    currentStep: signupStepToDraftStep(currentStep),
    updatedAt: Date.now(),
    formData: {
      role: formData.role,
      name: formData.name,
      username: formData.username,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      skills: formData.skills,
      termsAccepted: formData.termsAccepted,
    },
  };
}

export function getCompletedSteps(currentStep: SignupStep): SignupStep[] {
  const currentIndex = SIGNUP_STEPS.indexOf(currentStep);
  return SIGNUP_STEPS.slice(0, Math.max(0, currentIndex));
}

export function isTemporaryUsername(username: string | undefined): boolean {
  return Boolean(username && (username.startsWith('tmp_') || username.startsWith('temp_')));
}
