'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { analytics, EventTypes } from '../../lib/analytics-client';
import { queryKeys } from '../../lib/queryKeys';
import { optimisticUpdates } from '../../lib/reactQuery';

import { fetcher } from './shared';
import type { BaseEntity, MutationHookOptions, SessionUser } from './shared';

type UpdateProfileContext = {
  userId?: string;
  profileData: Record<string, unknown>;
};

export const useUpdateProfileMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>, UpdateProfileContext> = {}
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, onMutate, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (profileData: Record<string, unknown>) =>
      fetcher<BaseEntity>('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),
    onMutate: async (profileData: Record<string, unknown>) => {
      const userId = user?.id;
      if (userId) {
        optimisticUpdates.updateProfile(userId, profileData);
      }
      const externalContext = await onMutate?.(profileData);
      return externalContext ?? { userId, profileData };
    },
    onSuccess: (
      data: BaseEntity,
      variables: Record<string, unknown>,
      context: UpdateProfileContext | undefined
    ) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.profile('self') });
      if (context?.userId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(context.userId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(context.userId) });
      }

      analytics.trackEvent(EventTypes.USER_ACTION, {
        userId: context?.userId,
        updatedFields: Object.keys(variables || {}),
      });

      toast.success('Profile updated successfully');
      onSuccess?.(data, variables, context);
    },
    onError: (
      error: Error,
      variables: Record<string, unknown>,
      context: UpdateProfileContext | undefined
    ) => {
      if (context?.userId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(context.userId) });
      }
      toast.error(error.message || 'Failed to update profile');
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

export const useUpdatePrivacyMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (privacy: Record<string, unknown>) =>
      fetcher<BaseEntity>('/api/user/privacy', {
        method: 'PUT',
        body: JSON.stringify({ privacy }),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.settings('self') });
      toast.success('Privacy settings updated');
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || 'Failed to update privacy settings');
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

export const useUpdatePreferencesMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (preferences: Record<string, unknown>) =>
      fetcher<BaseEntity>('/api/user/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.settings('self') });
      toast.success('Preferences updated');
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || 'Failed to update preferences');
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

export const useUpdateFixerSettingsMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetcher<BaseEntity>('/api/user/fixer-settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.fixerSettings() });
      toast.success('Fixer settings updated');
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || 'Failed to update fixer settings');
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
