export type OtpResponse = {
  success: boolean;
  message: string;
};

export type VerifyOtpResponse = OtpResponse;

export type OtpStatusResponse = {
  exists: boolean;
  expired: boolean;
};

export type OtpVerificationReceipt = {
  identifier: string;
  purpose: string;
  verifiedAt: number;
};

export type OtpData = {
  otpHash: string;
  salt: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: number | null;
};
