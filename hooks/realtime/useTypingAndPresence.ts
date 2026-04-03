'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAbly, useAblyChannel } from '@/contexts/AblyContext';
import { EVENTS } from '@/lib/ably';

import type { PresenceMember, TypingUser } from './types';

export function useTypingIndicator(channelName: string | null | undefined) {
  const { publishMessage, currentUser } = useAbly();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId = typeof currentUser?.id === 'string' ? currentUser.id : undefined;

  useAblyChannel(
    channelName,
    EVENTS.USER_TYPING,
    (message) => {
      const data = (message.data || {}) as { userId?: string; userName?: string };
      const userId = data.userId;
      if (!userId || userId === currentUserId) {
        return;
      }

      setTypingUsers((prev) => {
        const filtered = prev.filter((item) => item.id !== userId);
        return [...filtered, { id: userId, name: data.userName, timestamp: Date.now() }];
      });

      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((item) => item.id !== userId));
      }, 3000);
    },
    [channelName, currentUserId]
  );

  const broadcastTyping = useCallback(() => {
    if (!channelName || !currentUserId) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    void publishMessage(channelName, EVENTS.USER_TYPING, {
      userId: currentUserId,
      userName: currentUser?.name || 'User',
    });

    typingTimeoutRef.current = setTimeout(() => {
      void publishMessage(channelName, EVENTS.USER_STOPPED_TYPING, {
        userId: currentUserId,
      });
    }, 1000);
  }, [channelName, currentUser?.name, currentUserId, publishMessage]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    broadcastTyping,
  };
}

export function usePresence(
  channelName: string | null | undefined,
  userData: Record<string, unknown> = {}
) {
  const { enterPresence, leavePresence, getPresenceMembers, currentUser } = useAbly();
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const currentUserId = typeof currentUser?.id === 'string' ? currentUser.id : undefined;

  useEffect(() => {
    if (!channelName || !currentUserId) {
      return;
    }

    const handlePresence = async () => {
      try {
        await enterPresence(channelName, {
          status: 'online',
          lastSeen: new Date().toISOString(),
          ...userData,
        });

        setIsOnline(true);
        const initialMembers = await getPresenceMembers(channelName);
        setMembers((initialMembers as PresenceMember[]) || []);
      } catch (error) {
        console.error('Failed to enter presence:', error);
      }
    };

    void handlePresence();

    return () => {
      void leavePresence(channelName);
      setIsOnline(false);
    };
  }, [channelName, currentUserId, enterPresence, getPresenceMembers, leavePresence, userData]);

  return {
    members,
    isOnline,
    onlineCount: members.length,
  };
}
