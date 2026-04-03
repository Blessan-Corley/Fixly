'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

import type { HelpCategory } from './help.types';

type HelpCategoriesGridProps = {
  categories: HelpCategory[];
  onCategorySelect: (categoryId: string) => void;
};

export default function HelpCategoriesGrid({
  categories,
  onCategorySelect,
}: HelpCategoriesGridProps) {
  return (
    <div className="mb-8">
      <h2 className="mb-6 text-2xl font-bold text-fixly-text">Browse Help Topics</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="cursor-pointer rounded-lg border border-fixly-border bg-fixly-card p-6 transition-shadow hover:shadow-md"
            onClick={() => onCategorySelect(category.id)}
          >
            <div className="mb-4 flex items-center">
              <category.icon className="mr-3 h-8 w-8 text-fixly-accent" />
              <h3 className="text-lg font-semibold text-fixly-text">{category.title}</h3>
            </div>
            <p className="mb-4 text-fixly-text-light">{category.description}</p>
            <div className="flex items-center text-fixly-accent">
              <span className="text-sm">{category.articles.length} articles</span>
              <ChevronRight className="ml-2 h-4 w-4" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
