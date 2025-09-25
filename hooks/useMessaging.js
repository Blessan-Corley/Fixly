/**
 * Real-time Messaging Hook
 * Handles private messaging between hirers and fixers after job assignment
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAbly, useAblyChannel } from '@/contexts/AblyContext';
import { ContentValidator } from '@/lib/validations/content-validator';

export function useMessaging(jobId, otherUserId) {
  const { currentUser, publishMessage, subscribeToChannel } = useAbly();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [messagingAllowed, setMessagingAllowed] = useState(true);
  const [reviewStatus, setReviewStatus] = useState(null);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Generate channel name (consistent ordering)
  const channelName = `job:${jobId}:private:${[currentUser?.id, otherUserId].sort().join(':')}`;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if messaging is allowed
  const checkMessagingStatus = useCallback(async () => {
    if (!jobId || !currentUser) return;

    try {
      const response = await fetch(`/api/messages/${jobId}/allowed`);
      if (response.ok) {
        const data = await response.json();
        setMessagingAllowed(data.messagingAllowed);
        setReviewStatus(data.reviewStatus);
      }
    } catch (err) {
      console.error('Failed to check messaging status:', err);
    }
  }, [jobId, currentUser]);

  // Load initial messages
  useEffect(() => {
    if (!jobId || !otherUserId || !currentUser) return;

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check messaging status first
        await checkMessagingStatus();

        const response = await fetch(`/api/messages/${jobId}?otherUserId=${otherUserId}`);

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
          setConnectionStatus('connected');
          setTimeout(scrollToBottom, 100);
        } else {
          setError('Failed to load messages');
          setConnectionStatus('error');
        }
      } catch (err) {
        setError(err.message);
        setConnectionStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [jobId, otherUserId, currentUser, checkMessagingStatus]);

  // Subscribe to new messages
  useAblyChannel(
    channelName,
    'message_sent',
    (message) => {
      const messageData = message.data;

      // Only add if it's not from current user (to avoid duplicates)
      if (messageData.senderId !== currentUser?.id) {
        setMessages(prev => [...prev, messageData]);
        setTimeout(scrollToBottom, 100);

        // Mark as delivered
        markAsDelivered(messageData.id);
      }
    },
    [channelName, currentUser?.id]
  );

  // Subscribe to typing indicators
  useAblyChannel(
    channelName,
    'typing_start',
    (message) => {
      if (message.data.userId !== currentUser?.id) {
        setOtherUserTyping(true);
      }
    },
    [channelName, currentUser?.id]
  );

  useAblyChannel(
    channelName,
    'typing_stop',
    (message) => {
      if (message.data.userId !== currentUser?.id) {
        setOtherUserTyping(false);
      }
    },
    [channelName, currentUser?.id]
  );

  // Subscribe to message status updates
  useAblyChannel(
    channelName,
    'message_delivered',
    (message) => {
      setMessages(prev => prev.map(msg =>
        msg.id === message.data.messageId
          ? { ...msg, delivered: true, deliveredAt: message.data.timestamp }
          : msg
      ));
    },
    [channelName]
  );

  useAblyChannel(
    channelName,
    'message_read',
    (message) => {
      setMessages(prev => prev.map(msg =>
        msg.id === message.data.messageId
          ? { ...msg, read: true, readAt: message.data.timestamp }
          : msg
      ));
    },
    [channelName]
  );

  // Send message
  const sendMessage = useCallback(async (content, type = 'text') => {
    if (!currentUser || !content.trim()) return false;

    // Check if messaging is allowed
    if (!messagingAllowed) {
      setError('Messaging has been closed for this job');
      return false;
    }

    try {
      setError(null);

      // Validate content (private messages have relaxed validation)
      const validation = await ContentValidator.validateContent(
        content,
        'private_message',
        currentUser.id
      );

      if (!validation.isValid) {
        setError('Message contains inappropriate content');
        return false;
      }

      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        jobId,
        senderId: currentUser.id,
        receiverId: otherUserId,
        content: content.trim(),
        type,
        timestamp: new Date().toISOString(),
        delivered: false,
        read: false
      };

      // Optimistic update
      setMessages(prev => [...prev, { ...messageData, sending: true }]);
      setTimeout(scrollToBottom, 100);

      // Send to server
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        // Remove sending status
        setMessages(prev => prev.map(msg =>
          msg.id === messageData.id
            ? { ...msg, sending: false, sent: true }
            : msg
        ));

        // Broadcast via Ably
        await publishMessage(channelName, 'message_sent', messageData);

        return true;
      } else {
        // Remove failed message
        setMessages(prev => prev.filter(msg => msg.id !== messageData.id));
        setError('Failed to send message');
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [currentUser, otherUserId, jobId, channelName, publishMessage]);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!currentUser || isTyping) return;

    setIsTyping(true);
    publishMessage(channelName, 'typing_start', {
      userId: currentUser.id,
      userName: currentUser.name
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentUser, isTyping, channelName, publishMessage]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!currentUser || !isTyping) return;

    setIsTyping(false);
    publishMessage(channelName, 'typing_stop', {
      userId: currentUser.id
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentUser, isTyping, channelName, publishMessage]);

  // Mark message as delivered
  const markAsDelivered = useCallback(async (messageId) => {
    try {
      await fetch('/api/messages/delivered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      });

      await publishMessage(channelName, 'message_delivered', {
        messageId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to mark message as delivered:', error);
    }
  }, [channelName, publishMessage]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      });

      await publishMessage(channelName, 'message_read', {
        messageId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }, [channelName, publishMessage]);

  // Mark all messages as read
  const markAllAsRead = useCallback(async () => {
    const unreadMessages = messages.filter(msg =>
      msg.senderId !== currentUser?.id && !msg.read
    );

    for (const message of unreadMessages) {
      await markAsRead(message.id);
    }
  }, [messages, currentUser?.id, markAsRead]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Get message statistics
  const getStats = () => {
    const totalMessages = messages.length;
    const myMessages = messages.filter(msg => msg.senderId === currentUser?.id).length;
    const otherMessages = totalMessages - myMessages;
    const unreadCount = messages.filter(msg =>
      msg.senderId !== currentUser?.id && !msg.read
    ).length;

    return {
      totalMessages,
      myMessages,
      otherMessages,
      unreadCount
    };
  };

  return {
    messages,
    isLoading,
    isTyping,
    otherUserTyping,
    error,
    connectionStatus,
    messagesEndRef,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    markAllAsRead,
    scrollToBottom,
    stats: getStats(),
    messagingAllowed,
    reviewStatus,
    checkMessagingStatus
  };
}

export function useMessageThreads() {
  const { currentUser } = useAbly();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const loadThreads = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/messages/threads');
        if (response.ok) {
          const data = await response.json();
          setThreads(data.threads || []);
        }
      } catch (error) {
        console.error('Failed to load message threads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThreads();
  }, [currentUser]);

  return {
    threads,
    isLoading
  };
}