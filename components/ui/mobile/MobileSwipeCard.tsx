'use client';

import { motion, type PanInfo } from 'framer-motion';
import { useState, type ReactNode } from 'react';

export interface MobileSwipeCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

type DragEvent = MouseEvent | TouchEvent | PointerEvent;

export function MobileSwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
}: MobileSwipeCardProps) {
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDragEnd = (_event: DragEvent, info: PanInfo): void => {
    setIsDragging(false);
    setDragX(0);

    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipeRight?.();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft?.();
    }
  };

  const handleDrag = (_event: DragEvent, info: PanInfo): void => {
    setDragX(info.offset.x);
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      style={{
        x: dragX,
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      {children}
    </motion.div>
  );
}
