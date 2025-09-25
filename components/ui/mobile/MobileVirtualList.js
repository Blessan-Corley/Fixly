'use client';

import { useState, useEffect, useRef } from 'react';

export function MobileVirtualList({
  items,
  renderItem,
  itemHeight = 80,
  className = '',
  onEndReached,
  endReachedThreshold = 200
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      const start = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(start + visibleCount + 2, items.length); // Buffer of 2 items

      setScrollTop(scrollTop);
      setVisibleRange({ start: Math.max(0, start - 1), end });

      // End reached detection
      if (onEndReached && container.scrollHeight - scrollTop - containerHeight < endReachedThreshold) {
        onEndReached();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length, itemHeight, onEndReached, endReachedThreshold]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: '100%' }}
    >
      <div
        ref={listRef}
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.start + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}