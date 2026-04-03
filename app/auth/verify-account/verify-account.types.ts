export type VerificationStep = 'send' | 'verify' | 'verified';

export type ResendCooldown = {
  email: number;
  phone: number;
};

export type VerificationResponse = {
  success?: boolean;
  message?: string;
  user?: {
    isVerified?: boolean;
    phone?: string;
  };
};
