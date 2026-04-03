import { redisUtils } from '@/lib/redis';

export async function invalidateConversationCaches(
  participantIds: string[],
  conversationId?: string
): Promise<void> {
  const uniqueParticipants = Array.from(new Set(participantIds.filter(Boolean)));

  for (const participantId of uniqueParticipants) {
    await redisUtils.invalidatePattern(`user_conversations:${participantId}:*`);
    if (conversationId) {
      await redisUtils.del(`conversation:${conversationId}:${participantId}`);
    }
  }
}
