'use client';

import { Loader } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import type { SettingsUser } from '../../../types/settings';

export type ProfilePanelProps = {
  user: SettingsUser | null;
  loading: boolean;
  showEmailChange: boolean;
  setShowEmailChange: Dispatch<SetStateAction<boolean>>;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  handleEmailChange: () => void;
  isValidEmail: (email: string) => boolean;
  showUsernameChange: boolean;
  setShowUsernameChange: Dispatch<SetStateAction<boolean>>;
  newUsername: string;
  setNewUsername: Dispatch<SetStateAction<string>>;
  handleUsernameChange: () => void;
  usernameChangeCount: number;
};

export function SettingsProfilePanel({
  user,
  loading,
  showEmailChange,
  setShowEmailChange,
  newEmail,
  setNewEmail,
  handleEmailChange,
  isValidEmail,
  showUsernameChange,
  setShowUsernameChange,
  newUsername,
  setNewUsername,
  handleUsernameChange,
  usernameChangeCount,
}: ProfilePanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Profile Information</h3>
        <div className="card">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name ?? ''}
                className="input-field"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Email</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="email" value={user?.email ?? ''} className="input-field" disabled />
                  <button
                    onClick={() => setShowEmailChange(true)}
                    className="btn-secondary whitespace-nowrap text-sm"
                  >
                    Change
                  </button>
                </div>

                {showEmailChange && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h4 className="mb-2 font-medium text-fixly-text">Change Email Address</h4>
                    <div className="space-y-3">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value.toLowerCase().trim())}
                        placeholder="Enter new email address"
                        className="input-field text-sm"
                      />
                      <p className="text-xs text-fixly-text-muted">
                        An OTP will be sent to the new email address for verification
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEmailChange}
                          disabled={loading || !newEmail || !isValidEmail(newEmail)}
                          className="btn-primary text-sm"
                        >
                          {loading ? 'Checking...' : 'Send OTP'}
                        </button>
                        <button
                          onClick={() => {
                            setShowEmailChange(false);
                            setNewEmail('');
                          }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Phone</label>
              <input
                type="tel"
                defaultValue={typeof user?.phone === 'string' ? user.phone : ''}
                className="input-field"
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Username</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={typeof user?.username === 'string' ? user.username : ''}
                    className="input-field"
                    placeholder="Choose a username"
                    disabled
                  />
                  <button
                    onClick={() => setShowUsernameChange(true)}
                    disabled={usernameChangeCount >= 3}
                    className="btn-secondary whitespace-nowrap text-sm"
                  >
                    Change
                  </button>
                </div>
                <p className="text-xs text-fixly-text-muted">
                  {usernameChangeCount >= 3
                    ? 'Maximum username changes reached (3/3)'
                    : `${3 - usernameChangeCount} changes remaining`}
                </p>

                {showUsernameChange && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h4 className="mb-2 font-medium text-fixly-text">Change Username</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) =>
                          setNewUsername(
                            e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                          )
                        }
                        placeholder="Enter new username"
                        className="input-field text-sm"
                        maxLength={20}
                      />
                      <p className="text-xs text-fixly-text-muted">
                        3-20 characters, only lowercase letters, numbers, and underscores
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUsernameChange}
                          disabled={loading || !newUsername || newUsername.length < 3}
                          className="btn-primary text-sm"
                        >
                          {loading ? 'Updating...' : 'Update Username'}
                        </button>
                        <button
                          onClick={() => {
                            setShowUsernameChange(false);
                            setNewUsername('');
                          }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-fixly-text">Bio</label>
            <textarea
              defaultValue={user?.bio ?? ''}
              className="textarea-field h-24"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="mt-6 flex justify-end">
            <button disabled={loading} className="btn-primary">
              {loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
