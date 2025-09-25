'use client';

export function useHapticFeedback() {
  const vibrate = (pattern = [10]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback not supported:', error);
      }
    }
  };

  const feedback = {
    light: () => vibrate([10]),
    medium: () => vibrate([20]),
    heavy: () => vibrate([30]),
    success: () => vibrate([10, 50, 10]),
    error: () => vibrate([50, 50, 50]),
    warning: () => vibrate([30, 30])
  };

  return feedback;
}