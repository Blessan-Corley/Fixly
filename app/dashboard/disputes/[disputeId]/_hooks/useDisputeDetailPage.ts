'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';

import {
  buildResponsePayload,
  getSessionUserId,
  isAbortError,
  isRecord,
  normalizeDispute,
  toStringSafe,
} from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.helpers';
import type {
  DisputeDetail,
  ResponseFormData,
} from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';
import { Channels, Events } from '@/lib/ably/events';
import { useAblyEvent } from '@/lib/ably/hooks';
import { useDisputeDetail, useSubmitDisputeResponse } from '@/lib/queries/disputes';
import { queryKeys } from '@/lib/queries/keys';

export function useDisputeDetailPage(disputeId: string) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sendMessageAbortRef = useRef<AbortController | null>(null);

  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseData, setResponseData] = useState<ResponseFormData>({
    content: '',
    acknowledgement: 'dispute',
    counterClaim: {
      category: '',
      description: '',
      desiredOutcome: '',
      amount: '',
    },
  });

  const sessionUserId = getSessionUserId(session);
  const { mutateAsync: submitDisputeResponse, isPending: submittingResponse } =
    useSubmitDisputeResponse(disputeId);
  const {
    data: disputeResponse,
    isLoading: disputeLoading,
    isError: disputeError,
    refetch: refetchDispute,
  } = useDisputeDetail(session && disputeId ? disputeId : '');
  const dispute = useMemo<DisputeDetail | null>(() => {
    const dataRecord = isRecord(disputeResponse) ? disputeResponse : {};
    const success = dataRecord.success === true;
    const normalizedDispute = normalizeDispute(dataRecord.dispute);
    return success && normalizedDispute ? normalizedDispute : null;
  }, [disputeResponse]);
  const loading = disputeLoading;
  const disputeJobId = dispute?.job?._id || '';

  useEffect(() => {
    return () => {
      if (sendMessageAbortRef.current) sendMessageAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (
      dispute &&
      dispute.againstUser._id === sessionUserId &&
      dispute.status === 'awaiting_response' &&
      !dispute.response?.respondedBy
    ) {
      setShowResponseForm(true);
    }
  }, [dispute, sessionUserId]);

  useEffect(() => {
    if (disputeError) {
      toast.error('Failed to fetch dispute');
      router.push('/dashboard/disputes');
    }
  }, [disputeError, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages]);

  useAblyEvent(
    disputeJobId ? Channels.job(disputeJobId) : '',
    Events.job.disputeOpened,
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(disputeId) });
    }, [disputeId, queryClient]),
    Boolean(disputeJobId)
  );

  useAblyEvent(
    disputeJobId ? Channels.job(disputeJobId) : '',
    Events.job.statusChanged,
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(disputeId) });
      if (disputeJobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(disputeJobId) });
      }
    }, [disputeId, disputeJobId, queryClient]),
    Boolean(disputeJobId)
  );

  const sendMessage = async (): Promise<void> => {
    if (!newMessage.trim() || sendingMessage || !disputeId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      if (sendMessageAbortRef.current) {
        sendMessageAbortRef.current.abort();
      }
      const abortController = new AbortController();
      sendMessageAbortRef.current = abortController;

      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return;
      }

      const data = (await response.json()) as unknown;
      const dataRecord = isRecord(data) ? data : {};
      const success = dataRecord.success === true;

      if (success) {
        await refetchDispute();
        toast.success('Message sent successfully');
      } else {
        toast.error(toStringSafe(dataRecord.message, 'Failed to send message'));
        setNewMessage(messageContent);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const submitResponse = async (): Promise<void> => {
    if (!responseData.content.trim() || !disputeId) {
      toast.error('Response content is required');
      return;
    }

    try {
      await submitDisputeResponse(buildResponsePayload(responseData));
      setShowResponseForm(false);
      await refetchDispute();
    } catch (error) {
      if (isAbortError(error)) return;
    }
  };

  const handleMessageKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const isInitiator = dispute?.initiatedBy._id === sessionUserId;
  const otherParty =
    dispute == null ? null : isInitiator ? dispute.againstUser : dispute.initiatedBy;
  const canRespond = Boolean(
    dispute &&
      dispute.againstUser._id === sessionUserId &&
      dispute.status === 'awaiting_response' &&
      !dispute.response?.respondedBy
  );
  const canSendMessages = Boolean(
    dispute &&
      dispute.status !== 'resolved' &&
      dispute.status !== 'closed' &&
      dispute.status !== 'cancelled'
  );

  return {
    dispute,
    loading,
    sendingMessage,
    submittingResponse,
    newMessage,
    setNewMessage,
    showResponseForm,
    setShowResponseForm,
    responseData,
    setResponseData,
    messagesEndRef,
    sendMessage,
    submitResponse,
    handleMessageKeyDown,
    sessionUserId,
    otherParty,
    canRespond,
    canSendMessages,
    router,
  };
}
