'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useApp } from '@/app/providers';
import {
  useCreateOrderMutation,
  useFixerSubscriptionQuery,
  useHirerSubscriptionQuery,
  useVerifyPaymentMutation,
  type FixerSubscriptionData,
  type HirerSubscriptionData,
  type VerifyPaymentBody,
} from '@/hooks/query/subscription';
import { Channels, Events } from '@/lib/ably/events';
import { useAblyChannel } from '@/lib/ably/hooks/useAblyChannel';
import { queryKeys } from '@/lib/queryKeys';
import type { BillingRole, PlanId } from '@/lib/services/billing/plans';

import type { BillingOption } from './subscription.types';
import { buildBillingOptions } from './subscription.utils';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

export type UseSubscriptionPageResult = {
  billingOptions: BillingOption[];
  subscriptionQuery: ReturnType<typeof useFixerSubscriptionQuery> | ReturnType<typeof useHirerSubscriptionQuery>;
  subscriptionData: FixerSubscriptionData | HirerSubscriptionData | undefined;
  isCreatingOrder: boolean;
  verifyState: VerifyState;
  verifyMessage: string | null;
  handleCheckout: (planId: PlanId) => Promise<void>;
};

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.Razorpay !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

export function useSubscriptionPage(role: BillingRole): UseSubscriptionPageResult {
  const queryClient = useQueryClient();
  const { user } = useApp();
  const userId = user?.id ?? '';
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const fixerSubscriptionQuery = useFixerSubscriptionQuery({ enabled: role === 'fixer' });
  const hirerSubscriptionQuery = useHirerSubscriptionQuery({ enabled: role === 'hirer' });

  // Real-time: auto-refresh subscription data when server pushes activation event.
  // Covers cases where webhook fires before or instead of verify-payment completing.
  useAblyChannel(
    userId ? Channels.user(userId) : '',
    useCallback(
      (message) => {
        if (message.name === Events.user.subscriptionActivated) {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.subscription.fixer() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.subscription.hirer() }),
            queryClient.invalidateQueries({ queryKey: ['subscription', 'eligibility'] }),
          ]);
        }
        if (message.name === Events.user.paymentFailed) {
          toast.error('Payment failed. Please try again or contact support.');
        }
      },
      [queryClient]
    ),
    !!userId
  );
  const subscriptionQuery = role === 'fixer' ? fixerSubscriptionQuery : hirerSubscriptionQuery;
  const subscriptionData = subscriptionQuery.data as FixerSubscriptionData | HirerSubscriptionData | undefined;

  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrderMutation();
  const { mutateAsync: verifyPayment } = useVerifyPaymentMutation();
  const billingOptions = useMemo(() => buildBillingOptions(role), [role]);

  const handleCheckout = useCallback(async (planId: PlanId): Promise<void> => {
    try {
      const order = await createOrder({ planId, role });

      await loadRazorpayScript();

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'Fixly',
          description: `${order.plan.displayName} – ${order.plan.billingCycle}`,
          theme: { color: '#F5A623' },
          handler: async (response: VerifyPaymentBody) => {
            try {
              setVerifyState('verifying');
              const result = await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.subscription.fixer() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.subscription.hirer() }),
                queryClient.invalidateQueries({ queryKey: ['subscription', 'eligibility'] }),
              ]);

              setVerifyState('success');
              setVerifyMessage(result.message ?? 'Subscription activated successfully.');
              toast.success('Subscription activated successfully.');
              resolve();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Verification failed';
              setVerifyState('error');
              setVerifyMessage(message);
              toast.error(message);
              reject(err instanceof Error ? err : new Error(message));
            }
          },
          modal: {
            ondismiss: () => {
              resolve();
            },
          },
        });
        rzp.open();
      });
    } catch (error: unknown) {
      if (verifyState !== 'error') {
        const message = error instanceof Error ? error.message : 'Failed to start checkout';
        toast.error(message);
      }
    }
  }, [createOrder, queryClient, role, verifyPayment, verifyState]);

  return {
    billingOptions,
    subscriptionQuery,
    subscriptionData,
    isCreatingOrder,
    verifyState,
    verifyMessage,
    handleCheckout,
  };
}
