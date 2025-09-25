'use client';

import { useRef, useState } from 'react';

export function useTouchGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onTap,
  onDoubleTap,
  onLongPress,
  threshold = 50,
  timeout = 300
}) {
  const touchRef = useRef(null);
  const [touchState, setTouchState] = useState({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTap: 0
  });

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const now = Date.now();

    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      lastTap: touchState.lastTap
    });

    // Long press detection
    if (onLongPress) {
      setTimeout(() => {
        if (touchState.startTime === now) {
          onLongPress(e);
        }
      }, 500);
    }
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const now = Date.now();
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const deltaTime = now - touchState.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Tap detection
    if (distance < 10 && deltaTime < timeout) {
      // Double tap detection
      if (onDoubleTap && now - touchState.lastTap < 300) {
        onDoubleTap(e);
        setTouchState(prev => ({ ...prev, lastTap: 0 }));
        return;
      }

      if (onTap) {
        onTap(e);
      }

      setTouchState(prev => ({ ...prev, lastTap: now }));
      return;
    }

    // Swipe detection
    if (distance > threshold && deltaTime < timeout) {
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight(e);
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft(e);
        }
      } else {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown(e);
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp(e);
        }
      }
    }
  };

  return {
    touchRef,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    touchState
  };
}