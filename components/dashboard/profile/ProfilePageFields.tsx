'use client';

import { AlertCircle, Edit, Loader } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { validateContent } from '../../../lib/validations/content-validator';
import type {
  BioInputFieldProps,
  BioValidationState,
  NameInputFieldProps,
  ProfileSectionProps,
} from '../../../types/profile';

export const NameInputField = memo(function NameInputField({
  value,
  onChange,
}: NameInputFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-fixly-text">Full Name</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        autoComplete="name"
        autoFocus={false}
      />
    </div>
  );
});
NameInputField.displayName = 'NameInputField';

export const BioInputField = memo(function BioInputField({ value, onChange }: BioInputFieldProps) {
  const [bioValidation, setBioValidation] = useState<BioValidationState>({
    isValid: true,
    violations: [],
  });
  const [validating, setValidating] = useState(false);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateBio = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) {
      setBioValidation({ isValid: true, violations: [] });
      return;
    }

    setValidating(true);
    try {
      const validation = await validateContent(text, 'profile');
      setBioValidation(validation);
    } catch (error: unknown) {
      console.warn('Bio validation failed:', error);
      setBioValidation({ isValid: true, violations: [] });
    } finally {
      setValidating(false);
    }
  }, []);

  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      if (value) {
        void validateBio(value);
      } else {
        setBioValidation({ isValid: true, violations: [] });
      }
    }, 800);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [value, validateBio]);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-fixly-text">
        Bio
        {validating && (
          <span className="ml-2 text-xs text-fixly-text-muted">
            <Loader className="mr-1 inline h-3 w-3 animate-spin" />
            Validating...
          </span>
        )}
      </label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell others about yourself... (avoid sharing phone numbers, addresses, or external contact info)"
        className={`textarea-field h-24 ${!bioValidation.isValid ? 'border-red-500 focus:border-red-500' : ''}`}
        maxLength={500}
        autoComplete="off"
      />
      <div className="mt-1 flex items-center justify-between">
        <div>
          {!bioValidation.isValid && bioValidation.violations.length > 0 && (
            <div className="text-xs text-red-500">
              <AlertCircle className="mr-1 inline h-3 w-3" />
              {bioValidation.violations[0].message}
            </div>
          )}
        </div>
        <p className="text-xs text-fixly-text-muted">{(value || '').length}/500 characters</p>
      </div>
    </div>
  );
});
BioInputField.displayName = 'BioInputField';

export const ProfileSection = memo(function ProfileSection({
  title,
  children,
  editable = false,
  editing = false,
  onEdit,
}: ProfileSectionProps) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-fixly-text">{title}</h3>
        {editable && !editing && onEdit && (
          <button onClick={onEdit} className="btn-ghost text-sm">
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
});
ProfileSection.displayName = 'ProfileSection';
