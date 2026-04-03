import type { AuthMethod, UserRole } from '@/types/User';

export type SignupDraftAddress = {
  formatted?: string;
  formattedAddress?: string;
  coordinates?: { lat?: number; lng?: number };
  [key: string]: unknown;
} | null;

export type SignupDraftFormData = {
  role?: UserRole;
  name: string;
  username: string;
  email: string;
  phone: string;
  address: SignupDraftAddress;
  skills: string[];
  termsAccepted: boolean;
};

export type SignupDraft = {
  version: 1;
  authMethod: AuthMethod | '';
  currentStep: 1 | 2 | 3 | 4;
  formData: SignupDraftFormData;
  updatedAt: number;
};

export const SIGNUP_DRAFT_STORAGE_KEY = 'fixly-signup-draft';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isRole(value: unknown): value is UserRole {
  return value === 'hirer' || value === 'fixer' || value === 'admin';
}

function isAuthMethod(value: unknown): value is AuthMethod {
  return value === 'email' || value === 'google' || value === 'phone';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getDefaultFormData(): SignupDraftFormData {
  return {
    role: undefined,
    name: '',
    username: '',
    email: '',
    phone: '',
    address: null,
    skills: [],
    termsAccepted: false,
  };
}

function normalizeDraft(value: unknown): SignupDraft | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const currentStep = value.currentStep;
  const formData = isPlainObject(value.formData) ? value.formData : {};
  const role = isRole(formData.role) ? formData.role : undefined;
  const authMethod = isAuthMethod(value.authMethod)
    ? value.authMethod
    : value.authMethod === ''
      ? ''
      : '';

  if (value.version !== 1) {
    return null;
  }

  if (currentStep !== 1 && currentStep !== 2 && currentStep !== 3 && currentStep !== 4) {
    return null;
  }

  return {
    version: 1,
    authMethod,
    currentStep,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    formData: {
      ...getDefaultFormData(),
      role,
      name: typeof formData.name === 'string' ? formData.name : '',
      username: typeof formData.username === 'string' ? formData.username : '',
      email: typeof formData.email === 'string' ? formData.email : '',
      phone: typeof formData.phone === 'string' ? formData.phone : '',
      address:
        formData.address === null || isPlainObject(formData.address)
          ? (formData.address as SignupDraftAddress)
          : null,
      skills: Array.isArray(formData.skills)
        ? formData.skills.filter((skill): skill is string => typeof skill === 'string')
        : [],
      termsAccepted: formData.termsAccepted === true,
    },
  };
}

export function readSignupDraft(): SignupDraft | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSignupDraft(draft: SignupDraft): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearSignupDraft(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
}

export function hasSignupDraftContent(draft: SignupDraft | null): boolean {
  if (!draft) {
    return false;
  }

  const { formData, authMethod } = draft;
  return Boolean(
    authMethod ||
    formData.role ||
    formData.name ||
    formData.username ||
    formData.email ||
    formData.phone ||
    formData.address ||
    formData.skills.length > 0 ||
    formData.termsAccepted
  );
}
