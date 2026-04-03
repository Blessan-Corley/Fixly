'use client';

import { AlertCircle, CheckCircle, Mail, Phone, User } from 'lucide-react';

import type { ProfileUser } from '../../../types/profile';

import { BioInputField, NameInputField, ProfileSection } from './ProfilePageFields';

export type ProfileBasicInformationSectionProps = {
  user: ProfileUser;
  editing: boolean;
  name: string;
  bio: string;
  onEdit: () => void;
  onNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onOpenEmailChange: () => void;
  onOpenPhoneChange: () => void;
  onOpenPhoneVerification: () => void;
};

export function ProfileBasicInformationSection({
  user,
  editing,
  name,
  bio,
  onEdit,
  onNameChange,
  onBioChange,
  onOpenEmailChange,
  onOpenPhoneChange,
  onOpenPhoneVerification,
}: ProfileBasicInformationSectionProps): React.JSX.Element {
  return (
    <ProfileSection title="Basic Information" editable={true} editing={editing} onEdit={onEdit}>
      {editing ? (
        <div className="space-y-4">
          <NameInputField value={name} onChange={onNameChange} />
          <BioInputField value={bio} onChange={onBioChange} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center">
            <User className="mr-3 h-4 w-4 text-fixly-accent" />
            <div>
              <div className="font-medium text-fixly-text">{user.name}</div>
              <div className="text-sm text-fixly-text-muted">@{user.username}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="mr-3 h-4 w-4 text-fixly-accent" />
              <div className="flex items-center gap-2">
                <span className="text-fixly-text">{user.email}</span>
                {user.emailVerified ? (
                  <div className="flex items-center">
                    <CheckCircle className="mr-1 h-4 w-4 text-fixly-success" />
                    <span className="text-xs font-medium text-fixly-success">Verified</span>
                  </div>
                ) : null}
              </div>
            </div>
            <button
              onClick={onOpenEmailChange}
              className="text-sm font-medium text-fixly-accent hover:text-fixly-accent-dark"
            >
              Change
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Phone className="mr-3 h-4 w-4 text-fixly-accent" />
              <div className="flex items-center gap-2">
                <span className="text-fixly-text">{user.phone}</span>
                {user.phoneVerified ? (
                  <div className="flex items-center">
                    <CheckCircle className="mr-1 h-4 w-4 text-fixly-success" />
                    <span className="text-xs font-medium text-fixly-success">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <AlertCircle className="mr-1 h-4 w-4 text-fixly-warning" />
                    <span className="text-xs font-medium text-fixly-warning">Not Verified</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!user.phoneVerified && user.phone ? (
                <button onClick={onOpenPhoneVerification} className="btn-primary px-3 py-1 text-xs">
                  Verify
                </button>
              ) : null}
              <button onClick={onOpenPhoneChange} className="btn-secondary px-3 py-1 text-xs">
                Change
              </button>
            </div>
          </div>

          {user.bio ? (
            <div>
              <p className="text-fixly-text-muted">{user.bio}</p>
            </div>
          ) : null}
        </div>
      )}
    </ProfileSection>
  );
}
