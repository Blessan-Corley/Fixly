import type { VerificationFormData } from '../../types/settings';

export const createEmptyVerificationFormData = (): VerificationFormData => ({
  documentType: '',
  documentFiles: [],
  additionalInfo: '',
});
