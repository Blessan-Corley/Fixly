export type RecoveryStep = 1 | 2 | 3;

export type ApiResponse = {
  success?: boolean;
  message?: string;
  expiresIn?: number;
};

export type PasswordStrength = {
  level: 0 | 1 | 2 | 3 | 4;
  text: '' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: 'gray' | 'red' | 'yellow' | 'green';
};

export type ForgotPasswordFormData = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};
