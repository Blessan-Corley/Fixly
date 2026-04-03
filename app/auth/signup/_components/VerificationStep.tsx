'use client';

import { Loader, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { SignupAddress, SignupErrors, SignupFormData } from '../_lib/signup.types';

type LocationSelectorProps = {
  initialLocation: SignupAddress;
  onLocationSelect: (location: SignupAddress) => void;
  required?: boolean;
};

type VerificationStepProps = {
  formData: SignupFormData;
  errors: SignupErrors;
  isLoading: boolean;
  onChange: <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => void;
};

const TypedEnhancedLocationSelector = dynamic<LocationSelectorProps>(
  () => import('@/components/LocationPicker/EnhancedLocationSelector'),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-2xl bg-fixly-surface-muted" />,
  }
);
const SkillSelector = dynamic(() => import('@/components/SkillSelector/SkillSelector'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-md border border-fixly-border p-3 text-sm text-fixly-text-muted">
      <Loader className="h-4 w-4 animate-spin" />
      Loading skills...
    </div>
  ),
});

export function VerificationStep({
  formData,
  errors,
  isLoading,
  onChange,
}: VerificationStepProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-fixly-text dark:text-white">Finish setup</h2>
      </div>

      <div className="rounded-2xl border border-fixly-border p-3 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-2 font-semibold text-fixly-text dark:text-white">
          <MapPin className="h-4 w-4 text-fixly-accent" />
          Your location
        </div>
        <TypedEnhancedLocationSelector
          initialLocation={formData.address}
          onLocationSelect={(location) => onChange('address', location)}
          required={true}
        />
        {errors.address ? <p className="mt-2 text-sm text-red-500">{errors.address}</p> : null}
      </div>

      {formData.role === 'fixer' ? (
        <div className="rounded-2xl border border-fixly-border p-3 dark:border-gray-700">
          <div className="mb-3 font-semibold text-fixly-text dark:text-white">Choose your skills</div>
          <SkillSelector
            isModal={false}
            isOpen={true}
            onClose={() => {}}
            required={true}
            className=""
            selectedSkills={formData.skills}
            onSkillsChange={(skills: string[]) => onChange('skills', skills)}
            minSkills={3}
            maxSkills={10}
          />
          {errors.skills ? <p className="mt-2 text-sm text-red-500">{errors.skills}</p> : null}
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-2xl border border-fixly-border p-4 dark:border-gray-700">
        <input
          type="checkbox"
          checked={formData.termsAccepted}
          onChange={(event) => onChange('termsAccepted', event.target.checked)}
          disabled={isLoading}
          className="mt-1 rounded border-gray-300 text-fixly-accent"
        />
        <span className="text-sm text-fixly-text dark:text-gray-100">
          I accept the Fixly Terms, Privacy Policy, and platform rules for secure account use.
        </span>
      </label>
      {errors.termsAccepted ? <p className="text-sm text-red-500">{errors.termsAccepted}</p> : null}
    </div>
  );
}
