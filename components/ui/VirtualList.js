// components/ui/VirtualList.js - High-performance virtual scrolling component
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VirtualList({
  items = [],
  height = 400,
  itemHeight = 80,
  renderItem,
  getItemHeight,
  overscan = 5,
  className = '',
  onScroll,
  estimatedItemHeight = 80,
  horizontal = false,
  rtl = false,
  loading = false,
  loadMore,
  hasMore = false,
  threshold = 200
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(height);
  const scrollElementRef = useRef();
  const observerRef = useRef();

  // Memoized calculations for performance
  const {
    visibleStartIndex,
    visibleEndIndex,
    totalSize,
    offsetBefore,
    offsetAfter,
    visibleItems
  } = useMemo(() => {
    if (!items.length) {
      return {
        visibleStartIndex: 0,
        visibleEndIndex: 0,
        totalSize: 0,
        offsetBefore: 0,
        offsetAfter: 0,
        visibleItems: []
      };
    }

    // Calculate visible range
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    // Calculate total size and offsets
    const total = items.length * itemHeight;
    const before = startIndex * itemHeight;
    const after = (items.length - endIndex - 1) * itemHeight;

    // Get visible items
    const visible = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      index: startIndex + index,
      key: item.id || item._id || startIndex + index
    }));

    return {
      visibleStartIndex: startIndex,
      visibleEndIndex: endIndex,
      totalSize: total,
      offsetBefore: before,
      offsetAfter: after,
      visibleItems: visible
    };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((e) => {
    const scrollPosition = horizontal ? e.target.scrollLeft : e.target.scrollTop;
    setScrollTop(scrollPosition);
    
    onScroll?.(e, {
      scrollTop: scrollPosition,
      visibleStartIndex,
      visibleEndIndex
    });

    // Infinite loading
    if (loadMore && hasMore && !loading) {
      const scrollElement = e.target;
      const threshold_px = threshold;
      
      const isNearEnd = horizontal
        ? scrollElement.scrollLeft + scrollElement.clientWidth >= scrollElement.scrollWidth - threshold_px
        : scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - threshold_px;
      
      if (isNearEnd) {
        loadMore();
      }
    }
  }, [horizontal, onScroll, visibleStartIndex, visibleEndIndex, loadMore, hasMore, loading, threshold]);

  // Resize observer for container
useEffect(() => {
  const element = scrollElementRef.current;
  if (!element) return;

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const newHeight = horizontal ? entry.contentRect.width : entry.contentRect.height;
      setContainerHeight(newHeight);
    }
  });

  resizeObserver.observe(element);
  observerRef.current = resizeObserver;

  return () => {
    if (observerRef.current) {
      observerRef.current.disconnect(); // Proper cleanup
    }
  };
}, [horizontal]);

  // Scroll to index
  const scrollToIndex = useCallback((index, align = 'auto') => {
    const element = scrollElementRef.current;
    if (!element || index < 0 || index >= items.length) return;

    const indexPosition = index * itemHeight;
    let scrollPosition;

    switch (align) {
      case 'start':
        scrollPosition = indexPosition;
        break;
      case 'center':
        scrollPosition = indexPosition - containerHeight / 2 + itemHeight / 2;
        break;
      case 'end':
        scrollPosition = indexPosition - containerHeight + itemHeight;
        break;
      default: // 'auto'
        const currentScroll = horizontal ? element.scrollLeft : element.scrollTop;
        if (indexPosition < currentScroll) {
          scrollPosition = indexPosition;
        } else if (indexPosition + itemHeight > currentScroll + containerHeight) {
          scrollPosition = indexPosition - containerHeight + itemHeight;
        } else {
          return; // Already visible
        }
    }

    element.scrollTo({
      [horizontal ? 'left' : 'top']: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });
  }, [items.length, itemHeight, containerHeight, horizontal]);

  // Scroll to item by ID
  const scrollToItem = useCallback((itemId, align = 'auto') => {
    const index = items.findIndex(item => (item.id || item._id) === itemId);
    if (index !== -1) {
      scrollToIndex(index, align);
    }
  }, [items, scrollToIndex]);

  // Expose scroll methods
  useEffect(() => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollToIndex = scrollToIndex;
      scrollElementRef.current.scrollToItem = scrollToItem;
    }
  }, [scrollToIndex, scrollToItem]);

  // Loading indicator
  const LoadingIndicator = () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fixly-accent"></div>
      <span className="ml-2 text-fixly-text-muted dark:text-gray-400">Loading more...</span>
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-4">📋</div>
      <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 mb-2">
        No items found
      </h3>
      <p className="text-fixly-text-muted dark:text-gray-400">
        There are no items to display at the moment.
      </p>
    </div>
  );

  if (!items.length && !loading) {
    return <EmptyState />;
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: horizontal ? '100%' : undefined,
        direction: rtl ? 'rtl' : 'ltr'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          [horizontal ? 'width' : 'height']: `${totalSize}px`,
          [horizontal ? 'height' : 'width']: '100%',
          position: 'relative'
        }}
      >
        {/* Before spacer */}
        {offsetBefore > 0 && (
          <div
            style={{
              [horizontal ? 'width' : 'height']: `${offsetBefore}px`,
              [horizontal ? 'height' : 'width']: '100%'
            }}
          />
        )}

        {/* Visible items */}
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, virtualIndex) => {
            const actualIndex = visibleStartIndex + virtualIndex;
            const itemKey = item.key;

            return (
              <motion.div
                key={itemKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.15, delay: virtualIndex * 0.02 }}
                style={{
                  position: 'absolute',
                  [horizontal ? 'left' : 'top']: `${actualIndex * itemHeight}px`,
                  [horizontal ? 'height' : 'width']: '100%',
                  [horizontal ? 'width' : 'height']: `${
                    getItemHeight ? getItemHeight(item, actualIndex) : itemHeight
                  }px`
                }}
              >
                {renderItem(item, actualIndex, {
                  isVisible: true,
                  style: {
                    height: horizontal ? '100%' : `${
                      getItemHeight ? getItemHeight(item, actualIndex) : itemHeight
                    }px`,
                    width: horizontal ? `${
                      getItemHeight ? getItemHeight(item, actualIndex) : itemHeight
                    }px` : '100%'
                  }
                })}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* After spacer */}
        {offsetAfter > 0 && (
          <div
            style={{
              [horizontal ? 'width' : 'height']: `${offsetAfter}px`,
              [horizontal ? 'height' : 'width']: '100%',
              position: 'absolute',
              [horizontal ? 'left' : 'top']: `${totalSize - offsetAfter}px`
            }}
          />
        )}

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              [horizontal ? 'left' : 'top']: `${totalSize}px`,
              [horizontal ? 'height' : 'width']: '100%'
            }}
          >
            <LoadingIndicator />
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for virtual list state management
export function useVirtualList({
  items = [],
  itemHeight = 80,
  containerHeight = 400,
  overscan = 5
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      start: startIndex,
      end: endIndex,
      items: items.slice(startIndex, endIndex + 1)
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  const scrollTo = useCallback((position) => {
    setScrollTop(position);
  }, []);

  const scrollToIndex = useCallback((index) => {
    const position = index * itemHeight;
    setScrollTop(position);
  }, [itemHeight]);

  return {
    visibleRange,
    scrollTop,
    scrollTo,
    scrollToIndex,
    setScrollTop
  };
}

// Variable height virtual list component
export function VariableHeightVirtualList({
  items = [],
  height = 400,
  estimatedItemHeight = 80,
  getItemHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState(new Map());
  const scrollElementRef = useRef();
  const itemRefs = useRef(new Map());

  // Measure item heights
const measureItem = useCallback((index, element) => {
  if (!element || !itemRefs.current.has(index)) return;
  
  const height = element.getBoundingClientRect().height;
  setItemHeights(prev => {
    const newMap = new Map(prev);
    newMap.set(index, height);
    return newMap;
  });
}, []);

  // Calculate positions and visible range
  const { visibleItems, totalHeight, offsetBefore } = useMemo(() => {
    let currentTop = 0;
    const positions = [];
    
    // Calculate all item positions
    for (let i = 0; i < items.length; i++) {
      const itemHeight = itemHeights.get(i) || 
                        (getItemHeight ? getItemHeight(items[i], i) : estimatedItemHeight);
      
      positions.push({
        index: i,
        top: currentTop,
        height: itemHeight,
        bottom: currentTop + itemHeight
      });
      
      currentTop += itemHeight;
    }

    // Find visible range
    const visibleTop = scrollTop;
    const visibleBottom = scrollTop + height;
    
    let startIndex = 0;
    let endIndex = positions.length - 1;
    
    // Binary search for start index
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].bottom > visibleTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }
    
    // Binary search for end index
    for (let i = startIndex; i < positions.length; i++) {
      if (positions[i].top > visibleBottom) {
        endIndex = Math.min(positions.length - 1, i + overscan);
        break;
      }
    }

    const visible = positions.slice(startIndex, endIndex + 1).map(pos => ({
      ...items[pos.index],
      index: pos.index,
      top: pos.top,
      height: pos.height,
      key: items[pos.index].id || items[pos.index]._id || pos.index
    }));

    return {
      visibleItems: visible,
      totalHeight: currentTop,
      offsetBefore: startIndex > 0 ? positions[startIndex].top : 0
    };
  }, [items, itemHeights, scrollTop, height, overscan, getItemHeight, estimatedItemHeight]);

  const handleScroll = useCallback((e) => {
    const scrollPosition = e.target.scrollTop;
    setScrollTop(scrollPosition);
    onScroll?.(e, { scrollTop: scrollPosition });
  }, [onScroll]);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map((item) => (
          <div
            key={item.key}
            ref={(el) => {
              itemRefs.current.set(item.index, el);
              measureItem(item.index, el);
            }}
            style={{
              position: 'absolute',
              top: `${item.top}px`,
              width: '100%',
              minHeight: `${item.height}px`
            }}
          >
            {renderItem(item, item.index, {
              isVisible: true,
              measureRef: (el) => measureItem(item.index, el)
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Grid virtual list for 2D virtualization
export function VirtualGrid({
  items = [],
  height = 400,
  width = '100%',
  itemHeight = 120,
  itemWidth = 200,
  columns = 'auto',
  gap = 16,
  renderItem,
  overscan = 5,
  className = ''
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollElementRef = useRef();

  // Calculate columns
  const actualColumns = useMemo(() => {
    if (typeof columns === 'number') return columns;
    return Math.floor((containerWidth + gap) / (itemWidth + gap)) || 1;
  }, [columns, containerWidth, itemWidth, gap]);

  // Calculate grid layout
  const gridData = useMemo(() => {
    const rows = Math.ceil(items.length / actualColumns);
    const totalHeight = rows * (itemHeight + gap) - gap;
    
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(rows - 1, Math.ceil((scrollTop + height) / (itemHeight + gap)) + overscan);
    
    const visibleItems = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < actualColumns; col++) {
        const index = row * actualColumns + col;
        if (index < items.length) {
          visibleItems.push({
            ...items[index],
            index,
            row,
            col,
            x: col * (itemWidth + gap),
            y: row * (itemHeight + gap),
            key: items[index].id || items[index]._id || index
          });
        }
      }
    }

    return {
      visibleItems,
      totalHeight,
      offsetBefore: startRow * (itemHeight + gap)
    };
  }, [items, actualColumns, itemHeight, itemWidth, gap, scrollTop, height, overscan]);

  // Resize observer
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width
      }}
      onScroll={handleScroll}
    >
      <div 
        style={{ 
          height: `${gridData.totalHeight}px`,
          position: 'relative',
          width: '100%'
        }}
      >
        <AnimatePresence>
          {gridData.visibleItems.map((item) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                left: `${item.x}px`,
                top: `${item.y}px`,
                width: `${itemWidth}px`,
                height: `${itemHeight}px`
              }}
            >
              {renderItem(item, item.index, {
                row: item.row,
                col: item.col,
                isVisible: true
              })}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export { VirtualList };