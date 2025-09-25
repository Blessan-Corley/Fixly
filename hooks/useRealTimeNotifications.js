/**
 * Real-time Notifications Hook
 * Replaces old SSE polling with Ably real-time notifications
 */

import { useEffect, useState, useRef } from 'react';
import { useAbly, useAblyChannel } from '@/contexts/AblyContext';
import { notificationService } from '@/lib/services/notificationService';

export function useRealTimeNotifications() {
  const { notifications, clearNotification, clearAllNotifications, currentUser } = useAbly();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!currentUser?.id) return false;

    try {
      setError(null);
      const result = await notificationService.markAsRead(notificationId, currentUser.id);

      if (result.success) {
        clearNotification(notificationId);
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser?.id) return false;

    try {
      setIsLoading(true);
      setError(null);

      const result = await notificationService.markAllAsRead(currentUser.id);

      if (result.success) {
        clearAllNotifications();
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Get notifications by type
  const getNotificationsByType = (type) => {
    return notifications.filter(n => n.type === type);
  };

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notifications.filter(n => new Date(n.timestamp) > yesterday);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    getNotificationsByType,
    getRecentNotifications
  };
}

export function useJobNotifications(jobId) {
  const { subscribeToChannel, currentUser } = useAbly();
  const [jobUpdates, setJobUpdates] = useState([]);
  const [comments, setComments] = useState([]);
  const [applications, setApplications] = useState([]);

  // Subscribe to job updates
  useAblyChannel(
    `job:${jobId}:updates`,
    'job_status_changed',
    (message) => {
      setJobUpdates(prev => [message.data, ...prev.slice(0, 9)]);
    },
    [jobId]
  );

  // Subscribe to job comments
  useAblyChannel(
    `job:${jobId}:comments`,
    'comment_posted',
    (message) => {
      setComments(prev => [message.data, ...prev.slice(0, 49)]);
    },
    [jobId]
  );

  // Subscribe to job applications (if user is job poster)
  useAblyChannel(
    `job:${jobId}:applications`,
    'application_submitted',
    (message) => {
      setApplications(prev => [message.data, ...prev.slice(0, 19)]);
    },
    [jobId]
  );

  return {
    jobUpdates,
    comments,
    applications,
    hasUpdates: jobUpdates.length > 0,
    hasNewComments: comments.length > 0,
    hasNewApplications: applications.length > 0
  };
}

export function useTypingIndicator(channelName) {
  const { publishMessage, subscribeToChannel, currentUser } = useAbly();
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Subscribe to typing events
  useEffect(() => {
    if (!channelName) return;

    const unsubscribe = subscribeToChannel(
      channelName,
      'user_typing',
      (message) => {
        const { userId, userName } = message.data;

        if (userId !== currentUser?.id) {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.id !== userId);
            return [...filtered, { id: userId, name: userName, timestamp: Date.now() }];
          });

          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.id !== userId));
          }, 3000);
        }
      }
    );

    return unsubscribe;
  }, [channelName, subscribeToChannel, currentUser?.id]);

  // Broadcast typing indicator
  const broadcastTyping = () => {
    if (!channelName || !currentUser) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing
    publishMessage(channelName, 'user_typing', {
      userId: currentUser.id,
      userName: currentUser.name
    });

    // Set timeout to stop broadcasting
    typingTimeoutRef.current = setTimeout(() => {
      publishMessage(channelName, 'user_stopped_typing', {
        userId: currentUser.id
      });
    }, 1000);
  };

  return {
    typingUsers,
    broadcastTyping
  };
}

export function usePresence(channelName, userData = {}) {
  const { enterPresence, leavePresence, getPresenceMembers, currentUser } = useAbly();
  const [members, setMembers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!channelName || !currentUser) return;

    const handlePresence = async () => {
      try {
        // Enter presence
        await enterPresence(channelName, {
          status: 'online',
          lastSeen: new Date().toISOString(),
          ...userData
        });

        setIsOnline(true);

        // Get initial members
        const initialMembers = await getPresenceMembers(channelName);
        setMembers(initialMembers);

      } catch (error) {
        console.error('Failed to enter presence:', error);
      }
    };

    handlePresence();

    return () => {
      leavePresence(channelName);
      setIsOnline(false);
    };
  }, [channelName, currentUser, enterPresence, leavePresence, getPresenceMembers]);

  return {
    members,
    isOnline,
    onlineCount: members.length
  };
}

export function useJobComments(jobId) {
  const { publishMessage, subscribeToChannel, currentUser } = useAbly();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to comments
  useAblyChannel(
    `job:${jobId}:comments`,
    'comment_posted',
    (message) => {
      setComments(prev => [message.data, ...prev]);
    },
    [jobId]
  );

  // Subscribe to comment likes
  useAblyChannel(
    `job:${jobId}:comments`,
    'comment_liked',
    (message) => {
      setComments(prev => prev.map(comment =>
        comment.id === message.data.commentId
          ? { ...comment, likes: message.data.newLikeCount, liked: message.data.likedBy === currentUser?.id }
          : comment
      ));
    },
    [jobId, currentUser?.id]
  );

  // Post comment
  const postComment = async (content) => {
    if (!currentUser || !content.trim()) return false;

    try {
      setIsLoading(true);

      const response = await fetch('/api/comments/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          content: content.trim(),
          authorId: currentUser.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }

      return false;
    } catch (error) {
      console.error('Failed to post comment:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Like comment
  const likeComment = async (commentId) => {
    if (!currentUser) return false;

    try {
      const response = await fetch('/api/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: currentUser.id
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to like comment:', error);
      return false;
    }
  };

  return {
    comments,
    isLoading,
    postComment,
    likeComment
  };
}