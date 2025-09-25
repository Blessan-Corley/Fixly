'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MobileHeader({
  title,
  showBack = false,
  showSearch = false,
  showFilter = false,
  onBack,
  onSearch,
  onFilter,
  rightAction,
  className = ''
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className={`bg-fixly-bg border-b border-fixly-border sticky top-0 z-40 ${className}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-fixly-accent/10 rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-fixly-text" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-fixly-text truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {showSearch && (
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                onSearch?.();
              }}
              className="p-2 hover:bg-fixly-accent/10 rounded-full transition-colors"
            >
              <Search className="h-5 w-5 text-fixly-text" />
            </button>
          )}

          {showFilter && (
            <button
              onClick={onFilter}
              className="p-2 hover:bg-fixly-accent/10 rounded-full transition-colors"
            >
              <Filter className="h-5 w-5 text-fixly-text" />
            </button>
          )}

          {rightAction}
        </div>
      </div>

      {/* Search Bar */}
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
                className="w-full px-4 py-2 bg-fixly-card border border-fixly-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}