import type { Message } from './types';

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function formatCurrency(value: number | null): string {
  if (value == null) return 'Budget not specified';
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function formatPresenceStatus(lastSeen?: string): string {
  if (!lastSeen) return 'Offline';

  const parsed = new Date(lastSeen);
  if (Number.isNaN(parsed.getTime())) return 'Offline';

  const diffInMinutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60)));
  if (diffInMinutes < 1) return 'Active just now';
  if (diffInMinutes < 60) return `Active ${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Active ${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return diffInDays < 7 ? `Active ${diffInDays}d ago` : parsed.toLocaleDateString();
}

export function formatAttachmentSize(size?: number): string {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMessagePreview(message: Message | undefined): string {
  if (!message) return 'Original message unavailable';
  if (message.content.trim()) {
    return message.content.length > 80 ? `${message.content.slice(0, 80)}...` : message.content;
  }
  if (message.attachments.length === 1) {
    return message.attachments[0].type === 'image' ? 'Image attachment' : 'File attachment';
  }
  if (message.attachments.length > 1) return `${message.attachments.length} attachments`;
  return 'Message';
}

export function getReactionCount(reactions: Message['reactions'], type: string): number {
  return reactions.filter((reaction) => reaction.type === type).length;
}

export function getUserReaction(reactions: Message['reactions'], userId: string): string | null {
  if (!userId) return null;
  return reactions.find((reaction) => reaction.user === userId)?.type ?? null;
}

export function extractPresenceUserId(member: unknown): string {
  if (!member || typeof member !== 'object') return '';
  const record = member as Record<string, unknown>;
  if (typeof record.clientId === 'string') return record.clientId;
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (typeof data.userId === 'string') return data.userId;
  }
  return '';
}

export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}

export const formatTime = formatRelativeTime;
