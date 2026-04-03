'use client';

type VibrationPattern = number | number[];

interface HapticFeedback {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  error: () => void;
  warning: () => void;
}

function vibrate(pattern: VibrationPattern = [10]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

  try {
    navigator.vibrate(pattern);
  } catch (error: unknown) {
    console.warn('Haptic feedback not supported:', error);
  }
}

export function useHapticFeedback(): HapticFeedback {
  return {
    light: () => vibrate([10]),
    medium: () => vibrate([20]),
    heavy: () => vibrate([30]),
    success: () => vibrate([10, 50, 10]),
    error: () => vibrate([50, 50, 50]),
    warning: () => vibrate([30, 30]),
  };
}
