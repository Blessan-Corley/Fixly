import type { UserRole } from '@/types/User';

import type { SignupAction, SignupFlowState, SignupFormData } from './signup.types';

export const initialFormData = (role?: UserRole): SignupFormData => ({
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

export const createState = (role?: UserRole): SignupFlowState => ({
  currentStep: 'role',
  formData: initialFormData(role),
  errors: {},
  isLoading: false,
  completedSteps: [],
});

export const reducer = (state: SignupFlowState, action: SignupAction): SignupFlowState => {
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
    case 'HYDRATE':
      return {
        ...state,
        ...action.state,
        formData: { ...state.formData, ...(action.state.formData ?? {}) },
      };
  }
};
