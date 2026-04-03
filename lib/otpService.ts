// Re-export barrel — implementation lives in lib/otp/
export {
  checkOTPStatus,
  consumeOTPVerification,
  hasOTPVerification,
  sendPasswordResetOTP,
  sendSignupOTP,
  storeOTP,
  verifyOTP,
} from './otp/service';
export { generateOTP } from './otp/hashing';
export type { OtpResponse, OtpStatusResponse, VerifyOtpResponse } from './otp/types';

export { default } from './otp/service';
