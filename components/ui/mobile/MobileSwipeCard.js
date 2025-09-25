'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function MobileSwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = ''
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    setDragX(0);

    const threshold = 100;
    if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDrag={(event, info) => setDragX(info.offset.x)}
      onDragEnd={handleDragEnd}
      className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      style={{
        x: dragX,
        opacity: isDragging ? 0.8 : 1
      }}
    >
      {children}
    </motion.div>
  );
}