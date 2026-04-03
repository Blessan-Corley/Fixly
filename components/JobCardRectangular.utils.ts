import type { DeadlineInfo } from './JobCardRectangular.types';

export const toTimestamp = (value?: string | Date): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatTimeAgo = (value?: string | Date): string => {
  const timestamp = toTimestamp(value);
  if (!timestamp) return '';

  const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

export const sanitizeText = (text?: string): string => {
  if (!text) return '';

  let sanitized = text.replace(/\b\d{10}\b/g, '***CONTACT***');
  sanitized = sanitized.replace(/\+91[-.\s]?\d{10}\b/g, '***CONTACT***');
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z|a-z]{2,}\b/gi,
    '***EMAIL***'
  );
  sanitized = sanitized.replace(
    /\b(whatsapp|telegram|instagram|facebook|twitter)\b/gi,
    '***SOCIAL***'
  );
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, '***LINK***');
  return sanitized;
};

export const getUrgencyColor = (urgency?: string): string => {
  switch (urgency) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getDeadlineInfo = (deadline?: string | Date): DeadlineInfo => {
  const timestamp = toTimestamp(deadline);
  if (!timestamp) {
    return { text: 'No deadline', color: 'text-gray-600', bgColor: 'bg-gray-100', urgent: false };
  }

  const diffInMs = timestamp - Date.now();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMs <= 0) {
    return { text: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100', urgent: false };
  }
  if (diffInHours < 24) {
    return {
      text: `${diffInHours}h left`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      urgent: true,
    };
  }
  if (diffInDays < 7) {
    return {
      text: `${diffInDays}d left`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      urgent: false,
    };
  }
  return {
    text: `${diffInDays}d left`,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    urgent: false,
  };
};
