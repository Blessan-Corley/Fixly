import { logger } from '@/lib/logger';
import { sendTemplatedNotification } from '@/lib/services/notifications';

type MessageNotificationInput = {
  participantId: string;
  conversationId: string;
  relatedJobId: string;
  senderId: string;
  senderName: string;
  messagePreview: string;
};

export async function sendPrivateMessageNotification(
  input: MessageNotificationInput
): Promise<void> {
  const {
    participantId,
    conversationId,
    relatedJobId,
    senderId,
    senderName,
    messagePreview,
  } = input;

  try {
    await sendTemplatedNotification(
      'PRIVATE_MESSAGE',
      participantId,
      {
        jobId: relatedJobId,
        senderId,
        senderName,
        messagePreview,
        conversationId,
      },
      {
        senderId,
        priority: 'high',
        actionData: {
          conversationId,
        },
      }
    );
  } catch (notificationError: unknown) {
    logger.error('Error sending private message notification:', notificationError);
  }
}
