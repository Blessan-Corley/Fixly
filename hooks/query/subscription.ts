'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApp } from '@/app/providers';
import { queryKeys } from '@/lib/queryKeys';

import { fetcher, toError } from './shared';
import type { MutationHookOptions, QueryHookOptions } from './shared';

export type SubscriptionPlanView = {
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  daysRemaining: number | null;
  features: string[];
};

export type FixerEligibility = {
  canApplyToJobs: boolean;
  canReceiveMessages: boolean;
  applicationCreditsRemaining: number | null;
  maxActiveApplications: number;
};

export type HirerEligibility = {
  canPostJobs: boolean;
  jobPostsRemaining: number | null;
  maxActiveJobs: number;
  canBoostJobs: boolean;
};

export type FixerSubscriptionData = {
  plan: SubscriptionPlanView;
  eligibility: FixerEligibility;
};

export type HirerSubscriptionData = {
  plan: SubscriptionPlanView;
  eligibility: HirerEligibility;
};

export type SubscriptionEligibility =
  | FixerSubscriptionData['eligibility']
  | HirerSubscriptionData['eligibility']
  | null;

export type VerifyPaymentResponse = {
  status: 'processed' | 'pending';
  message: string;
  subscription?: {
    isActive: boolean;
    planType: string;
    expiresAt: string | null;
    features: string[];
  };
};

export type CreateOrderResponse = {
  sessionId: string;
  url: string | null;
  plan: {
    id: string;
    displayName: string;
    amountRs: number;
    billingCycle: string;
  };
};

export const useFixerSubscriptionQuery = (
  options: QueryHookOptions<
    FixerSubscriptionData,
    ReturnType<typeof queryKeys.subscription.fixer>
  > = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.subscription.fixer(),
    queryFn: async () => {
      try {
        const data = await fetcher<FixerSubscriptionData>('/api/subscription/fixer');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    staleTime: 1000 * 60,
    ...queryOptions,
  });
};

export const useHirerSubscriptionQuery = (
  options: QueryHookOptions<
    HirerSubscriptionData,
    ReturnType<typeof queryKeys.subscription.hirer>
  > = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.subscription.hirer(),
    queryFn: async () => {
      try {
        const data = await fetcher<HirerSubscriptionData>('/api/subscription/hirer');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    staleTime: 1000 * 60,
    ...queryOptions,
  });
};

export const useSubscriptionEligibilityQuery = (
  options: QueryHookOptions<
    SubscriptionEligibility,
    ReturnType<typeof queryKeys.subscription.eligibility>
  > = {}
) => {
  const { user } = useApp();
  const role = user?.role;

  const fixerQuery = useFixerSubscriptionQuery({
    enabled: role === 'fixer',
    staleTime: 1000 * 60,
  });
  const hirerQuery = useHirerSubscriptionQuery({
    enabled: role === 'hirer',
    staleTime: 1000 * 60,
  });

  return useQuery({
    queryKey: queryKeys.subscription.eligibility(role),
    queryFn: async () => {
      if (role === 'fixer') {
        return fixerQuery.data?.eligibility ?? null;
      }

      if (role === 'hirer') {
        return hirerQuery.data?.eligibility ?? null;
      }

      return null;
    },
    enabled: role === 'fixer' ? fixerQuery.isSuccess : role === 'hirer' ? hirerQuery.isSuccess : true,
    staleTime: 1000 * 60,
    initialData:
      role === 'fixer'
        ? fixerQuery.data?.eligibility ?? null
        : role === 'hirer'
          ? hirerQuery.data?.eligibility ?? null
          : null,
    ...options,
  });
};

export const useCreateOrderMutation = (
  options: MutationHookOptions<CreateOrderResponse, Record<string, unknown>> = {}
) => {
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<CreateOrderResponse>('/api/subscription/create-order', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

export const useVerifyPaymentQuery = (
  sessionId: string | null | undefined,
  options: QueryHookOptions<
    VerifyPaymentResponse,
    ReturnType<typeof queryKeys.subscription.verifyPayment>
  > = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.subscription.verifyPayment(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('session_id is required');
      }

      try {
        const data = await fetcher<VerifyPaymentResponse>(
          `/api/subscription/verify-payment?session_id=${encodeURIComponent(sessionId)}`
        );
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(sessionId),
    staleTime: 3 * 1000,
    ...queryOptions,
  });
};

export const useInvalidateSubscriptionQueries = () => {
  const queryClient = useQueryClient();

  return async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.fixer() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.hirer() }),
      queryClient.invalidateQueries({ queryKey: ['subscription', 'eligibility'] }),
    ]);
  };
};
