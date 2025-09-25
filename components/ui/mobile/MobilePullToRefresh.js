'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export function MobilePullToRefresh({ onRefresh, children, className = '', disabled = false }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const maxPullDistance = 80;
  const triggerDistance = 60;

  const handleTouchStart = (e) => {
    if (disabled || window.scrollY > 0) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || disabled || window.scrollY > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    const limitedDistance = Math.min(distance * 0.5, maxPullDistance);

    setPullDistance(limitedDistance);

    // Prevent default scrolling only when pulling down
    if (distance > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging || disabled) return;

    setIsDragging(false);

    if (pullDistance >= triggerDistance) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } catch (error) {
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
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center pt-4"
            style={{ transform: `translateX(-50%) translateY(${pullDistance}px)` }}
          >
            <div className="bg-white rounded-full shadow-lg p-3 border border-gray-200">
              {isRefreshing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full"
                />
              ) : (
                <motion.div
                  animate={{ rotate: pullDistance >= triggerDistance ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowUp className="w-5 h-5 text-teal-500" />
                </motion.div>
              )}
            </div>
            <span className="text-xs text-gray-600 mt-2">
              {isRefreshing ? 'Refreshing...' : pullDistance >= triggerDistance ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with dynamic transform */}
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