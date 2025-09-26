/**
 * Online Status and Typing Indicators
 * Real-time user presence and activity indicators
 */

'use client';

import { useState, useEffect } from 'react';
import { useAbly, useAblyPresence } from '@/contexts/AblyContext';
import { Users, LogOut, MessageSquare, FileText, Edit, MapPin } from 'lucide-react';
import SmartAvatar from './SmartAvatar';

// Online Status Indicator
export function OnlineStatusIndicator({ userId, username, size = 'default', showLabel = false }) {
  const [lastSeen, setLastSeen] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  // Subscribe to user presence
  const presenceMembers = useAblyPresence(
    `user:${userId}:presence`,
    {
      status: 'online',
      lastSeen: new Date().toISOString()
    },
    !!userId
  );

  useEffect(() => {
    const userPresence = presenceMembers.find(member => member.data?.userId === userId);

    if (userPresence) {
      setIsOnline(true);
      setLastSeen(userPresence.data?.lastSeen);
    } else {
      setIsOnline(false);
      // Fetch last seen from server if not in presence
      fetchLastSeen(userId);
    }
  }, [presenceMembers, userId]);

  const fetchLastSeen = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}/last-seen`);
      if (response.ok) {
        const data = await response.json();
        setLastSeen(data.lastSeen);
      }
    } catch (error) {
      console.error('Failed to fetch last seen:', error);
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const sizeClasses = {
    small: 'w-2 h-2',
    default: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status Dot */}
      <div className="relative">
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full border-2 border-white dark:border-gray-800
            transition-colors duration-300
            ${isOnline
              ? 'bg-green-500 animate-pulse'
              : 'bg-gray-400 dark:bg-gray-600'
            }
          `}
        />
        {isOnline && (
          <div
            className={`
              absolute inset-0 rounded-full bg-green-500
              animate-ping opacity-75
              ${sizeClasses[size]}
            `}
          />
        )}
      </div>

      {/* Status Label */}
      {showLabel && (
        <div className="text-sm">
          {isOnline ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              Online
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              Last seen {formatLastSeen(lastSeen)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// User Avatar with Online Status
export function UserAvatarWithStatus({
  user,
  size = 'default',
  showStatus = true,
  showLastSeen = false,
  className = ""
}) {

  const statusSizes = {
    small: 'small',
    default: 'default',
    large: 'default',
    xl: 'large'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Smart Avatar */}
      <SmartAvatar
        user={user}
        size={size}
        alt={user?.name}
      />

      {/* Online Status */}
      {showStatus && user?.id && (
        <div className="absolute -bottom-1 -right-1">
          <OnlineStatusIndicator
            userId={user.id}
            username={user.username}
            size={statusSizes[size]}
          />
        </div>
      )}

      {/* Last Seen Tooltip */}
      {showLastSeen && user?.id && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <OnlineStatusIndicator
            userId={user.id}
            username={user.username}
            showLabel={true}
          />
        </div>
      )}
    </div>
  );
}

// Typing Indicator
export function TypingIndicator({ channelName, currentUserId, className = "" }) {
  const { subscribeToChannel } = useAbly();
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!channelName) return;

    const unsubscribe = subscribeToChannel(
      channelName,
      'user_typing',
      (message) => {
        const { userId, userName } = message.data;

        if (userId !== currentUserId) {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.id !== userId);
            return [...filtered, {
              id: userId,
              name: userName,
              timestamp: Date.now()
            }];
          });

          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.id !== userId));
          }, 3000);
        }
      }
    );

    const unsubscribeStop = subscribeToChannel(
      channelName,
      'user_stopped_typing',
      (message) => {
        const { userId } = message.data;
        if (userId !== currentUserId) {
          setTypingUsers(prev => prev.filter(u => u.id !== userId));
        }
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeStop) unsubscribeStop();
    };
  }, [channelName, currentUserId, subscribeToChannel]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
    } else {
      return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing`;
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {/* Animated dots */}
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" />
        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:0.1s]" />
        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
      </div>

      {/* Typing text */}
      <span className="animate-pulse">
        {getTypingText()}...
      </span>
    </div>
  );
}

// Live Activity Feed
export function LiveActivityFeed({ channelName, className = "" }) {
  const [activities, setActivities] = useState([]);
  const { subscribeToChannel } = useAbly();

  useEffect(() => {
    if (!channelName) return;

    const activityEvents = [
      'user_joined',
      'user_left',
      'comment_posted',
      'application_submitted',
      'job_updated'
    ];

    const unsubscribers = activityEvents.map(eventName =>
      subscribeToChannel(channelName, eventName, (message) => {
        const activity = {
          id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: eventName,
          data: message.data,
          timestamp: new Date().toISOString()
        };

        setActivities(prev => [activity, ...prev.slice(0, 9)]); // Keep last 10

        // Auto-remove after 30 seconds
        setTimeout(() => {
          setActivities(prev => prev.filter(a => a.id !== activity.id));
        }, 30000);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [channelName, subscribeToChannel]);

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'user_joined':
        return `${activity.data.userName} joined`;
      case 'user_left':
        return `${activity.data.userName} left`;
      case 'comment_posted':
        return `${activity.data.authorName} commented`;
      case 'application_submitted':
        return `${activity.data.fixerName} applied`;
      case 'job_updated':
        return `Job was updated`;
      default:
        return 'Activity occurred';
    }
  };

  const getActivityIcon = (type) => {
    const iconProps = "w-4 h-4 text-fixly-accent";

    switch (type) {
      case 'user_joined':
        return <Users className={iconProps} />;
      case 'user_left':
        return <LogOut className={iconProps} />;
      case 'comment_posted':
        return <MessageSquare className={iconProps} />;
      case 'application_submitted':
        return <FileText className={iconProps} />;
      case 'job_updated':
        return <Edit className={iconProps} />;
      default:
        return <MapPin className={iconProps} />;
    }
  };

  if (activities.length === 0) return null;

  return (
    <div className={`bg-card rounded-lg border border-border p-3 ${className}`}>
      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Live Activity
      </h4>

      <div className="space-y-2">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`
              flex items-center gap-2 text-xs text-muted-foreground
              animate-fade-in
              ${index === 0 ? 'opacity-100' : 'opacity-70'}
            `}
          >
            <div className="flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            <span>{getActivityText(activity)}</span>
            <span className="ml-auto">
              {new Date(activity.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// User List with Online Status
export function OnlineUsersList({ users, channelName, className = "" }) {
  const presenceMembers = useAblyPresence(channelName, {}, !!channelName);

  const getUserOnlineStatus = (userId) => {
    return presenceMembers.some(member => member.data?.userId === userId);
  };

  const onlineUsers = users.filter(user => getUserOnlineStatus(user.id));
  const offlineUsers = users.filter(user => !getUserOnlineStatus(user.id));

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Online ({onlineUsers.length})
          </h4>
          <div className="space-y-2">
            {onlineUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3">
                <UserAvatarWithStatus
                  user={user}
                  size="small"
                  showStatus={true}
                />
                <span className="text-sm text-foreground">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Users */}
      {offlineUsers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Offline ({offlineUsers.length})
          </h4>
          <div className="space-y-2">
            {offlineUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 opacity-60">
                <UserAvatarWithStatus
                  user={user}
                  size="small"
                  showStatus={true}
                />
                <span className="text-sm text-muted-foreground">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}