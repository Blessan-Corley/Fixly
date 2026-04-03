'use client';

import { useRef, useState, type TouchEvent } from 'react';

type GestureCallback<T extends HTMLElement> = (event: TouchEvent<T>) => void;

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTap: number;
}

export interface TouchGestureOptions<T extends HTMLElement = HTMLElement> {
  onSwipeLeft?: GestureCallback<T>;
  onSwipeRight?: GestureCallback<T>;
  onSwipeUp?: GestureCallback<T>;
  onSwipeDown?: GestureCallback<T>;
  onTap?: GestureCallback<T>;
  onDoubleTap?: GestureCallback<T>;
  onLongPress?: GestureCallback<T>;
  threshold?: number;
  timeout?: number;
  longPressDelay?: number;
}

export interface TouchGestureResult<T extends HTMLElement = HTMLElement> {
  touchRef: React.RefObject<T | null>;
  onTouchStart: (event: TouchEvent<T>) => void;
  onTouchEnd: (event: TouchEvent<T>) => void;
  onTouchCancel: () => void;
  touchState: TouchState;
}

const INITIAL_TOUCH_STATE: TouchState = {
  startX: 0,
  startY: 0,
  startTime: 0,
  lastTap: 0,
};

export function useTouchGestures<T extends HTMLElement = HTMLElement>({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onTap,
  onDoubleTap,
  onLongPress,
  threshold = 50,
  timeout = 300,
  longPressDelay = 500,
}: TouchGestureOptions<T> = {}): TouchGestureResult<T> {
  const touchRef = useRef<T | null>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStateRef = useRef<TouchState>(INITIAL_TOUCH_STATE);
  const [touchState, setTouchState] = useState<TouchState>(INITIAL_TOUCH_STATE);

  const setStateAndRef = (nextState: TouchState): void => {
    touchStateRef.current = nextState;
    setTouchState(nextState);
  };

  const clearLongPressTimeout = (): void => {
    if (!longPressTimeoutRef.current) return;
    clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = null;
  };

  const handleTouchStart = (event: TouchEvent<T>): void => {
    const touch = event.touches[0];
    const now = Date.now();
    const nextState: TouchState = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      lastTap: touchStateRef.current.lastTap,
    };

    setStateAndRef(nextState);
    clearLongPressTimeout();

    if (!onLongPress) return;

    longPressTimeoutRef.current = setTimeout(() => {
      if (touchStateRef.current.startTime === now) {
        onLongPress(event);
      }
    }, longPressDelay);
  };

  const handleTouchEnd = (event: TouchEvent<T>): void => {
    clearLongPressTimeout();

    const touch = event.changedTouches[0];
    const now = Date.now();
    const currentState = touchStateRef.current;
    const deltaX = touch.clientX - currentState.startX;
    const deltaY = touch.clientY - currentState.startY;
    const deltaTime = now - currentState.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < 10 && deltaTime < timeout) {
      if (onDoubleTap && now - currentState.lastTap < 300) {
        onDoubleTap(event);
        setStateAndRef({ ...currentState, lastTap: 0 });
        return;
      }

      onTap?.(event);
      setStateAndRef({ ...currentState, lastTap: now });
      return;
    }

    if (distance > threshold && deltaTime < timeout) {
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal) {
        if (deltaX > 0) onSwipeRight?.(event);
        if (deltaX < 0) onSwipeLeft?.(event);
      } else {
        if (deltaY > 0) onSwipeDown?.(event);
        if (deltaY < 0) onSwipeUp?.(event);
      }
    }
  };

  const handleTouchCancel = (): void => {
    clearLongPressTimeout();
  };

  return {
    touchRef,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    touchState,
  };
}
