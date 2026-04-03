'use client';

import { Loader, Save } from 'lucide-react';

import { PREFERENCE_LABELS } from '../../../lib/profile/constants';
import type { ProfileUser, UserPreferences } from '../../../types/profile';

import { ProfileSection } from './ProfilePageFields';

const PREFERENCE_DESCRIPTIONS: Record<keyof UserPreferences, string> = {
  emailNotifications: 'Receive important updates via email',
  smsNotifications: 'Receive urgent notifications via SMS',
  jobAlerts: 'Get notified about new job opportunities',
  marketingEmails: 'Receive promotional emails and updates',
};

export type ProfilePreferencesSectionProps = {
  editing: boolean;
  user: ProfileUser;
  preferences: UserPreferences;
  onEdit: () => void;
  onPreferenceChange: (key: keyof UserPreferences, value: boolean) => void;
};

export function ProfilePreferencesSection({
  editing,
  user,
  preferences,
  onEdit,
  onPreferenceChange,
}: ProfilePreferencesSectionProps) {
  return (
    <ProfileSection
      title="Notification Preferences"
      editable={true}
      editing={editing}
      onEdit={onEdit}
    >
      {editing ? (
        <div className="space-y-4">
          {(Object.entries(PREFERENCE_LABELS) as Array<[keyof UserPreferences, string]>).map(
            ([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-fixly-text">{label}</label>
                  <p className="text-sm text-fixly-text-muted">{PREFERENCE_DESCRIPTIONS[key]}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(e) => onPreferenceChange(key, e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-fixly-bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-fixly-border after:bg-fixly-card after:transition-all after:content-[''] peer-checked:bg-fixly-accent peer-checked:after:translate-x-full peer-checked:after:border-fixly-card peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/25"></div>
                </label>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.entries(PREFERENCE_LABELS) as Array<[keyof UserPreferences, string]>).map(
            ([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-fixly-text">{label}</span>
                <span
                  className={`text-sm ${
                    user.preferences?.[key] ? 'text-fixly-success' : 'text-fixly-text-muted'
                  }`}
                >
                  {user.preferences?.[key] ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </ProfileSection>
  );
}

export type ProfileEditActionButtonsProps = {
  editing: boolean;
  loading: boolean;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
};

export function ProfileEditActionButtons({
  editing,
  loading,
  onSave,
  onCancel,
}: ProfileEditActionButtonsProps) {
  if (!editing) {
    return null;
  }

  return (
    <div className="flex space-x-4">
      <button onClick={onSave} disabled={loading} className="btn-primary flex items-center">
        {loading ? (
          <Loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Changes
      </button>
      <button onClick={onCancel} className="btn-ghost">
        Cancel
      </button>
    </div>
  );
}
