'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useState, useRef, type ReactNode, type TouchEvent } from 'react';

export interface MobilePullToRefreshProps {
  onRefresh?: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function MobilePullToRefresh({
  onRefresh,
  children,
  className = '',
  disabled = false,
}: MobilePullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [startY, setStartY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const maxPullDistance = 80;
  const triggerDistance = 60;

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>): void => {
    if (disabled || window.scrollY > 0) return;
    setStartY(event.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>): void => {
    if (!isDragging || disabled || window.scrollY > 0) return;

    const currentY = event.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    const limitedDistance = Math.min(distance * 0.5, maxPullDistance);
    setPullDistance(limitedDistance);

    if (distance > 10) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = async (): Promise<void> => {
    if (!isDragging || disabled) return;

    setIsDragging(false);

    if (pullDistance >= triggerDistance) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } catch (error: unknown) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 transform flex-col items-center pt-4"
            style={{ transform: `translateX(-50%) translateY(${pullDistance}px)` }}
          >
            <div className="rounded-full border border-gray-200 bg-white p-3 shadow-lg">
              {isRefreshing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 rounded-full border-2 border-teal-500 border-t-transparent"
                />
              ) : (
                <motion.div
                  animate={{ rotate: pullDistance >= triggerDistance ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowUp className="h-5 w-5 text-teal-500" />
                </motion.div>
              )}
            </div>
            <span className="mt-2 text-xs text-gray-600">
              {isRefreshing
                ? 'Refreshing...'
                : pullDistance >= triggerDistance
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ y: isRefreshing ? 60 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ transform: `translateY(${Math.min(pullDistance, maxPullDistance)}px)` }}
      >
        {children}
      </motion.div>
    </div>
  );
}
