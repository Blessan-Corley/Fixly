'use client';

import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { MutableRefObject } from 'react';

type PlacesSearchProps = {
  autocompleteRef: MutableRefObject<HTMLInputElement | null>;
  onClose: () => void;
};

export function PlacesSearch({
  autocompleteRef,
  onClose,
}: PlacesSearchProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-fixly-text">Search Address</h3>
        <button onClick={onClose} className="text-fixly-text-muted hover:text-fixly-text">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative">
        <input
          ref={autocompleteRef}
          type="text"
          placeholder="Type your address..."
          className="input-field input-field-with-icon"
          defaultValue=""
        />
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
      </div>

      <p className="text-sm text-fixly-text-muted">
        Start typing your address and select from suggestions
      </p>
    </motion.div>
  );
}
