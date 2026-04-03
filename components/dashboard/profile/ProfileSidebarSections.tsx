'use client';

import { AlertCircle, Award, Camera, CheckCircle, Loader, Star } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { ProfileVerificationStatus } from '../../../components/dashboard/VerificationPrompt';
import SmartAvatar from '../../../components/ui/SmartAvatar';
import type { ProfileUser } from '../../../types/profile';

import { ProfileSection } from './ProfilePageFields';

export type ProfileSidebarSectionsProps = {
  user: ProfileUser;
  uploading: boolean;
  onPhotoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ProfileSidebarSections({
  user,
  uploading,
  onPhotoUpload,
}: ProfileSidebarSectionsProps) {
  return (
    <>
      <ProfileSection title="Profile Photo">
        <div className="text-center">
          <div className="relative inline-block">
            <SmartAvatar user={user} size="3xl" className="mx-auto" />
            <label
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-fixly-accent p-2 transition-colors hover:bg-fixly-accent-dark"
            >
              {uploading ? (
                <Loader className="h-4 w-4 animate-spin text-fixly-text" />
              ) : (
                <Camera className="h-4 w-4 text-fixly-text" />
              )}
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={onPhotoUpload}
              className="hidden"
            />
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm text-fixly-text-muted">Click camera to change photo</p>
            {user.profilePhoto?.lastUpdated && (
              <p className="mt-1 text-xs text-fixly-text-muted">
                Last updated: {new Date(user.profilePhoto.lastUpdated).toLocaleDateString()}
                <br />
                Next update:{' '}
                {new Date(
                  new Date(user.profilePhoto.lastUpdated).getTime() + 7 * 24 * 60 * 60 * 1000
                ).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </ProfileSection>

      <ProfileSection title="Account Status">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-fixly-text-muted">Verification</span>
            <div className="flex items-center">
              {user.isVerified ? (
                <>
                  <CheckCircle className="mr-1 h-4 w-4 text-fixly-success" />
                  <span className="text-sm text-fixly-success">Verified</span>
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 h-4 w-4 text-fixly-warning" />
                  <span className="text-sm text-fixly-warning">Pending</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-fixly-text-muted">Member Since</span>
            <span className="text-sm text-fixly-text">
              {new Date(user.createdAt ?? Date.now()).toLocaleDateString()}
            </span>
          </div>

          {user.role === 'fixer' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Rating</span>
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4 text-fixly-warning" />
                  <span className="text-sm text-fixly-text">
                    {user.rating?.average?.toFixed(1) || '0.0'} ({user.rating?.count || 0})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Jobs Completed</span>
                <span className="text-sm text-fixly-text">{user.jobsCompleted || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Plan</span>
                <div className="flex items-center">
                  {user.plan?.type === 'pro' ? (
                    <>
                      <Award className="mr-1 h-4 w-4 text-fixly-accent" />
                      <span className="text-sm font-medium text-fixly-accent">Pro</span>
                    </>
                  ) : (
                    <span className="text-sm text-fixly-text">Free</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </ProfileSection>

      <ProfileVerificationStatus user={user} showActions={true} />
    </>
  );
}
