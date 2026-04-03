import type { AuthMethod, UserRole } from '@/types/User';

export type SignupStep = 'role' | 'account' | 'profile' | 'verification';

export type SignupAddress = {
  formatted?: string;
  formattedAddress?: string;
  coordinates?: { lat?: number; lng?: number };
  [key: string]: unknown;
} | null;

export type SignupFormData = {
  role?: UserRole;
  authMethod: AuthMethod | '';
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: SignupAddress;
  skills: string[];
  termsAccepted: boolean;
};

export type SignupErrorKey = keyof SignupFormData | 'authMethod' | 'emailOtp' | 'form';
export type SignupErrors = Partial<Record<SignupErrorKey, string>>;

export type StepValidationResult = {
  valid: boolean;
  errors: SignupErrors;
};

export type SignupFlowState = {
  currentStep: SignupStep;
  formData: SignupFormData;
  errors: SignupErrors;
  isLoading: boolean;
  completedSteps: SignupStep[];
};

export type SignupAction =
  | { type: 'SET_STEP'; step: SignupStep }
  | { type: 'SET_ERRORS'; errors: SignupErrors }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'PATCH_FORM_DATA'; data: Partial<SignupFormData> }
  | { type: 'COMPLETE_STEP'; step: SignupStep }
  | { type: 'HYDRATE'; state: Partial<SignupFlowState> };
