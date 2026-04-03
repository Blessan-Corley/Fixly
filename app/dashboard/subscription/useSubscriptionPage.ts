'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  useCreateOrderMutation,
  useFixerSubscriptionQuery,
  useHirerSubscriptionQuery,
  useVerifyPaymentQuery,
  type FixerSubscriptionData,
  type HirerSubscriptionData,
} from '@/hooks/query/subscription';
import { queryKeys } from '@/lib/queryKeys';
import type { BillingRole, PlanId } from '@/lib/services/billing/plans';

import type { BillingOption } from './subscription.types';
import { buildBillingOptions } from './subscription.utils';

export type UseSubscriptionPageResult = {
  billingOptions: BillingOption[];
  subscriptionQuery: ReturnType<typeof useFixerSubscriptionQuery> | ReturnType<typeof useHirerSubscriptionQuery>;
  subscriptionData: FixerSubscriptionData | HirerSubscriptionData | undefined;
  verifyPaymentQuery: ReturnType<typeof useVerifyPaymentQuery>;
  isCreatingOrder: boolean;
  pollCount: number;
  handleCheckout: (planId: PlanId) => Promise<void>;
};

export function useSubscriptionPage(role: BillingRole): UseSubscriptionPageResult {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const cancelled = searchParams.get('cancelled') === 'true';
  const [pollCount, setPollCount] = useState(0);

  const fixerSubscriptionQuery = useFixerSubscriptionQuery({ enabled: role === 'fixer' });
  const hirerSubscriptionQuery = useHirerSubscriptionQuery({ enabled: role === 'hirer' });
  const subscriptionQuery = role === 'fixer' ? fixerSubscriptionQuery : hirerSubscriptionQuery;
  const subscriptionData = subscriptionQuery.data as FixerSubscriptionData | HirerSubscriptionData | undefined;

  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrderMutation();
  const verifyPaymentQuery = useVerifyPaymentQuery(sessionId, { enabled: Boolean(sessionId) });
  const billingOptions = useMemo(() => buildBillingOptions(role), [role]);

  useEffect(() => {
    if (!cancelled) return;
    toast.error('Payment cancelled. Your subscription was not changed.');
  }, [cancelled]);

  useEffect(() => {
    if (verifyPaymentQuery.data?.status !== 'processed') return;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.fixer() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.hirer() }),
      queryClient.invalidateQueries({ queryKey: ['subscription', 'eligibility'] }),
    ]);
    toast.success('Subscription activated successfully.');
  }, [queryClient, verifyPaymentQuery.data?.status]);

  useEffect(() => {
    if (!sessionId || verifyPaymentQuery.data?.status !== 'pending' || pollCount >= 10) return;
    const timeout = window.setTimeout(() => {
      setPollCount((current) => current + 1);
      void verifyPaymentQuery.refetch();
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [pollCount, sessionId, verifyPaymentQuery]);

  const handleCheckout = async (planId: PlanId): Promise<void> => {
    try {
      const response = await createOrder({ planId, role });
      if (!response.url) throw new Error('Checkout URL was not returned');
      window.location.href = response.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start checkout';
      toast.error(message);
    }
  };

  return {
    billingOptions,
    subscriptionQuery,
    subscriptionData,
    verifyPaymentQuery,
    isCreatingOrder,
    pollCount,
    handleCheckout,
  };
}
