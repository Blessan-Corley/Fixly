'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Search } from 'lucide-react';

import type { SearchResult } from './help.types';

type HelpSearchResultsProps = {
  results: SearchResult[];
  query: string;
  onArticleSelect: (categoryId: string, articleId: string) => void;
  onFaqToggle: (id: string) => void;
};

export default function HelpSearchResults({
  results,
  query,
  onArticleSelect,
  onFaqToggle,
}: HelpSearchResultsProps) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-bold text-fixly-text">Search Results ({results.length})</h2>

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="cursor-pointer rounded-lg border border-fixly-border bg-fixly-card p-6 transition-shadow hover:shadow-md"
              onClick={() => {
                if (result.type === 'faq') {
                  onFaqToggle(result.id);
                } else {
                  onArticleSelect(result.categoryId, result.id);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center">
                    <span className="mr-2 rounded-full bg-fixly-accent-light px-2 py-1 text-xs text-fixly-accent">
                      {result.category}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-fixly-text">{result.title}</h3>
                  <p className="line-clamp-2 text-fixly-text-light">
                    {result.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-fixly-text-light" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">No results found</h3>
          <p className="text-fixly-text-light">
            Try different keywords or browse our help topics below
          </p>
        </div>
      )}
    </div>
  );
}
