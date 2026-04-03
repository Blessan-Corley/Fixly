'use client';

import { AlertCircle, CheckCircle, Clock, Loader, Phone, RefreshCw, Send } from 'lucide-react';

import {
  useFirebasePhoneAuth,
  type VerificationPayload,
} from './_hooks/useFirebasePhoneAuth';

interface FirebasePhoneAuthProps {
  phoneNumber: string;
  onVerificationComplete?: (payload: VerificationPayload) => void;
  onError?: (error: Error) => void;
}

export default function FirebasePhoneAuth({
  phoneNumber,
  onVerificationComplete,
  onError,
}: FirebasePhoneAuthProps): React.JSX.Element {
  const { otp, setOtp, step, loading, resendCooldown, error, setError, sendOTP, verifyOTP } =
    useFirebasePhoneAuth({ phoneNumber, onVerificationComplete, onError });

  if (step === 'completed') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Phone verified successfully</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div id="recaptcha-container" className="hidden" />

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {step === 'send' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
            <Phone className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Verify Phone Number</p>
              <p className="text-sm text-blue-700">+91{phoneNumber}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={sendOTP}
            disabled={loading || resendCooldown > 0}
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : resendCooldown > 0 ? (
              <>
                <Clock className="h-4 w-4" />
                Wait {resendCooldown}s
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Verification Code
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500">
            A free SMS will be sent to verify your number.
          </p>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Code Sent</p>
              <p className="text-sm text-green-700">Check your SMS for the verification code.</p>
            </div>
          </div>

          <div>
            <label htmlFor="phone-otp" className="mb-2 block text-sm font-medium text-gray-700">
              Enter 6-digit verification code
            </label>
            <input
              id="phone-otp"
              type="text"
              value={otp}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                setError('');
              }}
              placeholder="000000"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-wider focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Verify Phone Number
              </>
            )}
          </button>

          <button
            type="button"
            onClick={sendOTP}
            disabled={loading || resendCooldown > 0}
            className="btn-secondary flex w-full items-center justify-center gap-2 text-sm"
          >
            {resendCooldown > 0 ? (
              <>
                <Clock className="h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Resend Code
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
