'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';

interface VisibleRange {
  start: number;
  end: number;
}

export interface MobileVirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

const INITIAL_VISIBLE_RANGE: VisibleRange = { start: 0, end: 10 };

export function MobileVirtualList<T>({
  items,
  renderItem,
  itemHeight = 80,
  className = '',
  onEndReached,
  endReachedThreshold = 200,
}: MobileVirtualListProps<T>) {
  const [visibleRange, setVisibleRange] = useState<VisibleRange>(INITIAL_VISIBLE_RANGE);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      const start = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(start + visibleCount + 2, items.length);

      setVisibleRange({ start: Math.max(0, start - 1), end });

      if (
        onEndReached &&
        container.scrollHeight - scrollTop - containerHeight < endReachedThreshold
      ) {
        onEndReached();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length, itemHeight, onEndReached, endReachedThreshold]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div ref={containerRef} className={`overflow-auto ${className}`} style={{ height: '100%' }}>
      <div
        ref={listRef}
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={visibleRange.start + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
