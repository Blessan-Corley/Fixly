'use client';

import { Eye, EyeOff, Loader, Lock } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { PASSWORD_REQUIREMENT_LABELS } from '../../../lib/profile/constants';
import type {
  PasswordData,
  PasswordValidationRequirements,
  PasswordValidationResult,
  PasswordVisibility,
} from '../../../types/profile';

import { ProfileSection } from './ProfilePageFields';

export type ProfilePasswordSecuritySectionProps = {
  showPasswordChange: boolean;
  setShowPasswordChange: Dispatch<SetStateAction<boolean>>;
  passwordData: PasswordData;
  setPasswordData: Dispatch<SetStateAction<PasswordData>>;
  showPasswords: PasswordVisibility;
  setShowPasswords: Dispatch<SetStateAction<PasswordVisibility>>;
  passwordLoading: boolean;
  validatePassword: (password: string) => PasswordValidationResult;
  onSubmitPasswordChange: () => void | Promise<void>;
  onCancelPasswordChange: () => void;
};

export function ProfilePasswordSecuritySection({
  showPasswordChange,
  setShowPasswordChange,
  passwordData,
  setPasswordData,
  showPasswords,
  setShowPasswords,
  passwordLoading,
  validatePassword,
  onSubmitPasswordChange,
  onCancelPasswordChange,
}: ProfilePasswordSecuritySectionProps) {
  const passwordValidation = passwordData.newPassword
    ? validatePassword(passwordData.newPassword)
    : null;

  const canSubmitPasswordChange =
    !passwordLoading &&
    Boolean(passwordData.currentPassword) &&
    Boolean(passwordData.newPassword) &&
    Boolean(passwordData.confirmPassword) &&
    passwordData.newPassword === passwordData.confirmPassword &&
    (passwordValidation?.isValid ?? false);

  return (
    <ProfileSection title="Password & Security">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-fixly-text">Password</h4>
            <p className="text-sm text-fixly-text-muted">Change your account password</p>
          </div>
          <button onClick={() => setShowPasswordChange(true)} className="btn-secondary text-sm">
            <Lock className="mr-2 h-4 w-4" />
            Change Password
          </button>
        </div>

        {showPasswordChange && (
          <div className="space-y-4 rounded-lg border border-fixly-info-bg bg-fixly-info-bg p-4">
            <h4 className="font-medium text-fixly-text">Change Password</h4>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  placeholder="Enter current password"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-fixly-text-muted hover:text-fixly-text"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  placeholder="Enter new password"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-fixly-text-muted hover:text-fixly-text"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {passwordData.newPassword && passwordValidation && (
                <div className="mt-2 space-y-1">
                  {(
                    Object.entries(PASSWORD_REQUIREMENT_LABELS) as Array<
                      [keyof PasswordValidationRequirements, string]
                    >
                  ).map(([key, label]) => {
                    const isValid = passwordValidation.requirements[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center text-xs ${isValid ? 'text-fixly-success' : 'text-fixly-error'}`}
                      >
                        <div
                          className={`mr-2 h-1 w-1 rounded-full ${isValid ? 'bg-fixly-success' : 'bg-fixly-error'}`}
                        ></div>
                        {label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="Confirm new password"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-fixly-text-muted hover:text-fixly-text"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {passwordData.confirmPassword && (
                <div
                  className={`mt-1 text-xs ${
                    passwordData.newPassword === passwordData.confirmPassword
                      ? 'text-fixly-success'
                      : 'text-fixly-error'
                  }`}
                >
                  {passwordData.newPassword === passwordData.confirmPassword
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onSubmitPasswordChange}
                disabled={!canSubmitPasswordChange}
                className="btn-primary text-sm"
              >
                {passwordLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                {passwordLoading ? 'Sending OTP...' : 'Change Password'}
              </button>
              <button onClick={onCancelPasswordChange} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </ProfileSection>
  );
}
