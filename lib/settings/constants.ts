import type { VerificationDocumentOption } from '../../types/settings';

export const VERIFICATION_DOCUMENT_OPTIONS: VerificationDocumentOption[] = [
  { value: 'aadhaar', label: 'Aadhaar Card', icon: '🆔' },
  { value: 'pan', label: 'PAN Card', icon: '💳' },
  { value: 'driving_license', label: 'Driving License', icon: '🚗' },
  { value: 'voter_id', label: 'Voter ID', icon: '🗳️' },
  { value: 'passport', label: 'Passport', icon: '📘' },
  { value: 'other', label: 'Other Government ID', icon: '📋' },
];
