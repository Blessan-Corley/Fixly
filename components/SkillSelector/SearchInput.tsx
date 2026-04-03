'use client';

import { Search } from 'lucide-react';
import { memo, forwardRef } from 'react';

import type { SearchInputProps } from './types';

const SearchInput = memo(
  forwardRef<HTMLInputElement, SearchInputProps>(
    ({ value, onChange, placeholder = 'Search for skills...' }, ref) => (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400 dark:text-gray-500" />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pl-10 text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-fixly-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          autoComplete="off"
        />
      </div>
    )
  )
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
