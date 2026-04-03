'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import type { HelpCategory } from './help.types';

type HelpCategoryViewProps = {
  category: HelpCategory;
  onBack: () => void;
  onArticleSelect: (articleId: string) => void;
};

export default function HelpCategoryView({
  category,
  onBack,
  onArticleSelect,
}: HelpCategoryViewProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-fixly-accent hover:text-fixly-accent-dark"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to all topics
      </button>

      <div className="mb-8">
        <div className="mb-4 flex items-center">
          <category.icon className="mr-3 h-8 w-8 text-fixly-accent" />
          <h1 className="text-3xl font-bold text-fixly-text">{category.title}</h1>
        </div>
        <p className="text-lg text-fixly-text-light">{category.description}</p>
      </div>

      <div className="grid gap-4">
        {category.articles.map((article, index) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="cursor-pointer rounded-lg border border-fixly-border bg-fixly-card p-6 transition-shadow hover:shadow-md"
            onClick={() => onArticleSelect(article.id)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fixly-text">{article.title}</h3>
              <ChevronRight className="h-5 w-5 text-fixly-text-light" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
