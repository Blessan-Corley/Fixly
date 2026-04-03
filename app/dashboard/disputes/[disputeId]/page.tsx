'use client';

import { AlertCircle, Loader } from 'lucide-react';
import { useParams } from 'next/navigation';

import { DisputeDetailsCard } from '@/app/dashboard/disputes/[disputeId]/_components/DisputeDetailsCard';
import { DisputeDiscussionCard } from '@/app/dashboard/disputes/[disputeId]/_components/DisputeDiscussionCard';
import { DisputeEvidenceCard } from '@/app/dashboard/disputes/[disputeId]/_components/DisputeEvidenceCard';
import { DisputeHeader } from '@/app/dashboard/disputes/[disputeId]/_components/DisputeHeader';
import { DisputeResponseCard } from '@/app/dashboard/disputes/[disputeId]/_components/DisputeResponseCard';
import { DisputeResponseFormCard } from '@/app/dashboard/disputes/[disputeId]/_components/DisputeResponseFormCard';
import { DisputeSidebar } from '@/app/dashboard/disputes/[disputeId]/_components/DisputeSidebar';
import { useDisputeDetailPage } from '@/app/dashboard/disputes/[disputeId]/_hooks/useDisputeDetailPage';

export default function DisputeDetailPage() {
  const params = useParams<{ disputeId?: string | string[] }>();
  const disputeIdParam = params?.disputeId;
  const disputeId = Array.isArray(disputeIdParam) ? disputeIdParam[0] : (disputeIdParam ?? '');
  const controller = useDisputeDetailPage(disputeId);

  if (controller.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!controller.dispute) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-fixly-text">Dispute not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <DisputeHeader
          dispute={controller.dispute}
          onBack={() => controller.router.push('/dashboard/disputes')}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <DisputeDetailsCard dispute={controller.dispute} />
            <DisputeEvidenceCard evidence={controller.dispute.evidence} />

            {controller.canRespond && controller.showResponseForm && (
              <DisputeResponseFormCard
                responseData={controller.responseData}
                submittingResponse={controller.submittingResponse}
                onChange={(updater) => controller.setResponseData(updater)}
                onCancel={() => controller.setShowResponseForm(false)}
                onSubmit={() => {
                  void controller.submitResponse();
                }}
              />
            )}

            {controller.dispute.response && controller.dispute.response.respondedBy && controller.otherParty && (
              <DisputeResponseCard
                response={controller.dispute.response}
                responder={controller.otherParty}
              />
            )}

            <DisputeDiscussionCard
              messages={controller.dispute.messages}
              currentUserId={controller.sessionUserId}
              newMessage={controller.newMessage}
              sendingMessage={controller.sendingMessage}
              canSendMessages={controller.canSendMessages}
              messagesEndRef={controller.messagesEndRef}
              onMessageChange={controller.setNewMessage}
              onMessageKeyDown={controller.handleMessageKeyDown}
              onSend={() => {
                void controller.sendMessage();
              }}
            />
          </div>

          <DisputeSidebar
            dispute={controller.dispute}
            canRespond={controller.canRespond}
            showResponseForm={controller.showResponseForm}
            onOpenResponseForm={() => controller.setShowResponseForm(true)}
            onViewJob={(jobId) => controller.router.push(`/jobs/${jobId}`)}
          />
        </div>
      </div>
    </div>
  );
}
