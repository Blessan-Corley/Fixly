'use client';

import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { usePageLoading } from '../../../contexts/LoadingContext';
import { useProfileSecurityFlows } from '../../../hooks/useProfileSecurityFlows';
import { DEFAULT_PREFERENCES } from '../../../lib/profile/constants';
import { updateProfile, uploadProfilePhoto } from '../../../lib/services/profileClient';
import { validateProfilePhotoFile } from '../../../lib/validations/profile';
import type { ProfileLocation, ProfileUser, UserPreferences } from '../../../types/profile';
import { useApp } from '../../providers';

export type UseProfilePageResult = {
  user: ProfileUser | null;
  loading: boolean;
  uploading: boolean;
  editing: boolean;
  name: string;
  bio: string;
  location: ProfileLocation | null;
  skills: string[];
  availableNow: boolean;
  serviceRadius: number;
  preferences: UserPreferences;
  showLocationPicker: boolean;
  setAvailableNow: (value: boolean) => void;
  setServiceRadius: (value: number) => void;
  setShowLocationPicker: (value: boolean) => void;
  handleNameChange: (value: string) => void;
  handleBioChange: (value: string) => void;
  handleSkillsChange: (value: string[]) => void;
  handlePreferenceChange: (key: keyof UserPreferences, value: boolean) => void;
  handleLocationSelect: (selectedLoc: ProfileLocation | null) => void;
  handlePhotoUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSave: () => Promise<void>;
  handleCancelEdit: () => void;
  handleStartEdit: () => void;
  securityFlows: ReturnType<typeof useProfileSecurityFlows>;
};

export function useProfilePage(): UseProfilePageResult {
  const { user: appUser, updateUser } = useApp();
  const user = appUser as ProfileUser | null;
  const { startLoading, stopLoading } = usePageLoading('profile');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState<ProfileLocation | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [availableNow, setAvailableNow] = useState(true);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  const securityFlows = useProfileSecurityFlows({ user, updateUser });

  useEffect(() => {
    if (user && !initialized) {
      setName(user.name ?? '');
      setBio(user.bio ?? '');
      setLocation(user.location ?? null);
      setSkills(user.skills ?? []);
      setAvailableNow(user.availableNow ?? true);
      setServiceRadius(user.serviceRadius ?? 10);
      setPreferences({
        emailNotifications: user.preferences?.emailNotifications ?? true,
        smsNotifications: user.preferences?.smsNotifications ?? true,
        jobAlerts: user.preferences?.jobAlerts ?? true,
        marketingEmails: user.preferences?.marketingEmails ?? false,
      });
      setInitialized(true);
    }
  }, [user, initialized]);

  const handleNameChange = useCallback((value: string) => { setName(value); }, []);
  const handleBioChange = useCallback((value: string) => { setBio(value); }, []);
  const handleSkillsChange = useCallback((value: string[]) => { setSkills(value); }, []);

  const handlePreferenceChange = useCallback((key: keyof UserPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleLocationSelect = useCallback((selectedLoc: ProfileLocation | null) => {
    setLocation(selectedLoc);
    setShowLocationPicker(false);
    toast.success('Location selected - Click "Save Changes" to update your profile');
  }, []);

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    const photoValidationError = validateProfilePhotoFile(file);
    if (photoValidationError) {
      toast.error(photoValidationError);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadProfilePhoto(file);
      if (result.ok) {
        updateUser({
          ...user,
          profilePhoto: result.profilePhoto,
          image: result.profilePhoto.url,
          photoURL: result.profilePhoto.url,
          picture: result.profilePhoto.url,
        });
        const nextUpdateLabel = result.profilePhoto.nextUpdateDate
          ? new Date(result.profilePhoto.nextUpdateDate).toLocaleDateString()
          : 'later';
        toast.success(`Profile photo updated successfully! Next update available on ${nextUpdateLabel}`);
      } else if (result.status === 429) {
        const daysRemaining = result.daysRemaining ?? 7;
        toast.error(`${result.message ?? 'Rate limited'} (${daysRemaining} days remaining)`);
      } else {
        toast.error(result.message ?? 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setLoading(true);
    startLoading('Saving profile changes...');
    try {
      const result = await updateProfile({ name, bio, location, skills, availableNow, serviceRadius, preferences });
      if (result.ok && result.user) {
        updateUser(result.user);
        setEditing(false);
        setInitialized(false);
        toast.success('Profile updated successfully');
      } else if (result.rateLimited) {
        toast.error(result.message ?? 'Location update rate limit exceeded', { duration: 6000 });
      } else {
        toast.error(result.message ?? 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setInitialized(false);
  }, []);

  const handleStartEdit = useCallback(() => { setEditing(true); }, []);

  return {
    user,
    loading,
    uploading,
    editing,
    name,
    bio,
    location,
    skills,
    availableNow,
    serviceRadius,
    preferences,
    showLocationPicker,
    setAvailableNow,
    setServiceRadius,
    setShowLocationPicker,
    handleNameChange,
    handleBioChange,
    handleSkillsChange,
    handlePreferenceChange,
    handleLocationSelect,
    handlePhotoUpload,
    handleSave,
    handleCancelEdit,
    handleStartEdit,
    securityFlows,
  };
}
