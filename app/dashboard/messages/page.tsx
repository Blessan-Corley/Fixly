'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { GlobalLoading } from '@/components/ui/GlobalLoading';

import { Composer } from './_components/Composer';
import { ConversationHeader } from './_components/ConversationHeader';
import { ConversationInfoPanel } from './_components/ConversationInfoPanel';
import { ConversationList } from './_components/ConversationList';
import { MessageThread } from './_components/MessageThread';
import { PresenceBar } from './_components/PresenceBar';
import { useMessagesController } from './_hooks/useMessagesController';

export default function MessagesPage(): React.JSX.Element {
  const controller = useMessagesController();

  if (controller.conversationList.isLoading && controller.conversationList.conversations.length === 0) {
    return (
      <GlobalLoading
        loading={true}
        message="Loading messages..."
        fullScreen={false}
        className="h-full"
      />
    );
  }

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-fixly-border bg-fixly-card">
      <AnimatePresence>
        {(controller.showConversationsList || !controller.isMobile) && (
          <motion.div
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            className={
              controller.isMobile ? 'absolute inset-0 z-10 bg-fixly-card' : 'w-1/3 min-w-80'
            }
          >
            <ConversationList
              conversations={controller.conversationList.filteredConversations}
              selectedId={controller.selectedConversationId}
              onSelect={(conversation) => {
                void controller.handleSelectConversation(conversation);
              }}
              isLoading={controller.conversationList.isLoading}
              hasMore={controller.conversationList.hasMore}
              onLoadMore={() => {
                void controller.conversationList.loadMore();
              }}
              searchQuery={controller.conversationList.searchQuery}
              onSearchChange={controller.conversationList.setSearchQuery}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`flex flex-1 ${controller.isMobile && controller.showConversationsList ? 'hidden' : ''}`}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <ConversationHeader
            name={controller.selectedOtherParticipant?.name || 'Unknown user'}
            photoURL={controller.selectedOtherParticipant?.photoURL}
            statusText={controller.participantStatusText}
            isOnline={
              controller.selectedOtherParticipant?.isOnline === true ||
              controller.participantStatusText === 'Active now'
            }
            isMobile={controller.isMobile}
            onBack={() => controller.setShowConversationsList(true)}
            onToggleInfo={() => controller.setShowInfo(!controller.showInfo)}
          />
          <PresenceBar
            presenceUsers={controller.presenceUsers}
            currentUserId={controller.sessionUser?.id || ''}
          />
          <MessageThread
            conversationId={controller.selectedConversationId}
            messages={controller.thread.messages}
            currentUserId={controller.sessionUser?.id || ''}
            selectedOtherParticipantId={controller.selectedOtherParticipantId}
            isLoading={controller.thread.isLoading}
            hasMore={controller.thread.hasMore}
            onLoadMore={() => {
              void controller.thread.loadMore();
            }}
            onReact={(messageId, reactionType) => {
              void controller.handleReact(messageId, reactionType);
            }}
            onEdit={controller.handleEdit}
            onDelete={(messageId) => {
              void controller.handleDelete(messageId);
            }}
            onReply={controller.handleReply}
            reactionOptions={controller.reactionOptions}
          />
          <Composer
            conversationId={controller.selectedConversationId}
            currentUserId={controller.sessionUser?.id || ''}
            currentUserName={controller.sessionUser?.name || 'User'}
            onSend={controller.handleSend}
            onAttach={controller.uploadAttachments}
            onTyping={controller.handleTyping}
            isLoading={controller.thread.isSending}
            isUploading={controller.pendingAttachments.some((attachment) => attachment.uploading)}
            replyTo={controller.replyingToMessage}
            editMessage={controller.editingMessage}
            pendingAttachments={controller.pendingAttachments}
            onRemoveAttachment={controller.removePendingAttachment}
            onCancelReply={controller.cancelReply}
          />
        </div>
        {controller.showInfo && controller.selectedThread ? (
          <ConversationInfoPanel
            participants={controller.presenceUsers}
            relatedJob={controller.selectedThread.relatedJob}
            onClose={() => controller.setShowInfo(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
