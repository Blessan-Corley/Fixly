'use client';

import { CheckCircle, Loader, Phone } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { VerificationStep } from './verify-account.types';

const FirebasePhoneAuth = dynamic(() => import('@/components/auth/FirebasePhoneAuth'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-md border border-fixly-border p-3 text-sm text-fixly-text-muted">
      <Loader className="h-4 w-4 animate-spin" />
      Loading phone verification...
    </div>
  ),
});

type VerifyPhoneSectionProps = {
  phone: string | null | undefined;
  phoneStep: VerificationStep;
  loading: boolean;
  showPhoneEdit: boolean;
  newPhoneNumber: string;
  onVerificationComplete: (data: unknown) => void;
  onUpdatePhone: () => void;
  onToggleEdit: (show: boolean) => void;
  onNewPhoneChange: (value: string) => void;
};

export function VerifyPhoneSection({
  phone,
  phoneStep,
  loading,
  showPhoneEdit,
  newPhoneNumber,
  onVerificationComplete,
  onUpdatePhone,
  onToggleEdit,
  onNewPhoneChange,
}: VerifyPhoneSectionProps): JSX.Element | null {
  if (!phone) return null;

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            phoneStep === 'verified' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {phoneStep === 'verified' ? <CheckCircle className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-fixly-text dark:text-slate-100">Phone Verification</h3>
          <p className="text-sm text-fixly-text-light dark:text-slate-400">{phone}</p>
        </div>
        {phoneStep !== 'verified' ? (
          <button
            onClick={() => onToggleEdit(true)}
            className="text-xs text-fixly-accent underline hover:text-fixly-accent-dark"
          >
            This isn&apos;t your number?
          </button>
        ) : null}
      </div>

      {phoneStep === 'verified' ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-600 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Phone verified successfully!</span>
        </div>
      ) : null}

      {showPhoneEdit && phoneStep !== 'verified' ? (
        <div className="space-y-4 rounded-lg bg-blue-50 p-4 dark:bg-slate-800">
          <h4 className="font-medium text-fixly-text dark:text-slate-100">Update Phone Number</h4>
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text dark:text-slate-200">
              New Phone Number
            </label>
            <input
              type="tel"
              value={newPhoneNumber}
              onChange={(e) => onNewPhoneChange(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter your new phone number"
              className="w-full rounded-lg border border-fixly-border bg-white px-4 py-3 text-fixly-text focus:border-fixly-accent focus:ring-2 focus:ring-fixly-accent dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              maxLength={10}
            />
            <p className="mt-1 text-xs text-fixly-text-muted dark:text-slate-400">
              Enter 10-digit mobile number without country code
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onUpdatePhone}
              disabled={loading || !newPhoneNumber || newPhoneNumber.length < 10}
              className="btn-primary flex flex-1 items-center justify-center gap-2"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Update Number'}
            </button>
            <button
              onClick={() => { onToggleEdit(false); onNewPhoneChange(''); }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : phoneStep !== 'verified' ? (
        <FirebasePhoneAuth
          phoneNumber={phone}
          onVerificationComplete={onVerificationComplete}
          onError={(error) => console.error('Phone verification error:', error)}
        />
      ) : null}
    </div>
  );
}
