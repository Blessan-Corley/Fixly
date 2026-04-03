'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

export interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
  onFilter?: () => void;
  rightAction?: ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  showBack = false,
  showSearch = false,
  showFilter = false,
  onBack,
  onSearch,
  onFilter,
  rightAction,
  className = '',
}: MobileHeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  const handleBack = (): void => {
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  };

  return (
    <div className={`sticky top-0 z-40 border-b border-fixly-border bg-fixly-bg ${className}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-fixly-accent/10"
            >
              <ChevronLeft className="h-5 w-5 text-fixly-text" />
            </button>
          )}
          <h1 className="truncate text-lg font-semibold text-fixly-text">{title}</h1>
        </div>

        <div className="flex items-center space-x-2">
          {showSearch && (
            <button
              onClick={() => {
                setSearchOpen((prev) => !prev);
                onSearch?.();
              }}
              className="rounded-full p-2 transition-colors hover:bg-fixly-accent/10"
            >
              <Search className="h-5 w-5 text-fixly-text" />
            </button>
          )}

          {showFilter && (
            <button
              onClick={onFilter}
              className="rounded-full p-2 transition-colors hover:bg-fixly-accent/10"
            >
              <Filter className="h-5 w-5 text-fixly-text" />
            </button>
          )}

          {rightAction}
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-fixly-border"
          >
            <div className="p-4">
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-lg border border-fixly-border bg-fixly-card px-4 py-2 text-fixly-text focus:outline-none focus:ring-2 focus:ring-fixly-accent"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
