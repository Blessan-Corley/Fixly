import { toast } from 'sonner';

import type { TouchEventLike } from './locationUtils.types';

export const handleLocationError = (error: unknown, context = 'location operation'): string => {
  console.error(`Location error in ${context}:`, error);

  const raw = error instanceof Error ? error.message : String(error ?? '');
  const msg = raw.toLowerCase();

  let userMessage = 'Something went wrong with location services';
  if (msg.includes('permission') || msg.includes('denied')) {
    userMessage = 'Location access was denied. You can still select location manually.';
  } else if (msg.includes('unavailable') || msg.includes('timeout')) {
    userMessage = 'Unable to detect your location. Please select manually.';
  } else if (msg.includes('network') || msg.includes('fetch')) {
    userMessage = 'Network error. Please check your connection and try again.';
  } else if (msg.includes('google') || msg.includes('maps')) {
    userMessage = 'Maps service is temporarily unavailable. Please try again later.';
  } else if (msg.includes('outside india')) {
    userMessage = 'Your location appears to be outside India. Please select an Indian location.';
  }

  toast.error(userMessage);
  return userMessage;
};

export const debounce = <TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
): ((...args: TArgs) => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => func(...args), wait);
  };
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.innerWidth <= 768 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

export const getTouchCoordinates = (event: TouchEventLike): { x: number; y: number } | null => {
  const touch = event.touches?.[0] ?? event.changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
};

export const announceToScreenReader = (message: string): void => {
  if (typeof window === 'undefined') return;
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
  document.body.appendChild(el);
  el.textContent = message;
  setTimeout(() => document.body.removeChild(el), 1000);
};
