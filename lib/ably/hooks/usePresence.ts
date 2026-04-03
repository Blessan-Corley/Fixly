'use client';

import Ably from 'ably';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

import { getAblyClient } from '@/lib/ably/client';

interface PresenceMember {
  clientId: string;
  data?: unknown;
  timestamp?: number;
}

/**
 * Subscribe to presence on an Ably channel.
 * Returns current members and enter/leave your own presence.
 *
 * @param channelName - Use Channels.conversationPresence(id) etc. Never raw strings.
 * @param userData - Optional data to attach to your presence entry
 * @param enabled - Set to false to disable presence
 */
export function usePresence(
  channelName: string,
  userData?: unknown,
  enabled = true
): { members: PresenceMember[] } {
  const { status, data: session } = useSession();
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !enabled || !channelName) {
      return;
    }

    const client = getAblyClient();
    const channel = client.channels.get(channelName);
    channelRef.current = channel;

    const updateMembers = async (): Promise<void> => {
      try {
        const present = await channel.presence.get();
        setMembers(
          present.map((member) => ({
            clientId: member.clientId,
            data: member.data,
            timestamp: member.timestamp,
          }))
        );
      } catch (error) {
        console.error('[Ably Presence] Failed to get members:', error);
      }
    };

    const onPresenceChange = (): void => {
      void updateMembers();
    };

    channel.presence.subscribe(onPresenceChange);
    void channel.presence.enter(userData ?? { userId: session?.user?.id });
    void updateMembers();

    return () => {
      channel.presence.unsubscribe(onPresenceChange);
      void channel.presence.leave().catch(() => {
        // Ignore leave errors on cleanup — connection may already be closing
      });
      channelRef.current = null;
    };
  }, [channelName, enabled, session?.user?.id, status, userData]);

  return { members };
}
