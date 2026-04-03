'use client';

import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

import type { faqCategories, faqs } from '@/app/support/support.data';

type Props = {
  faqList: typeof faqs;
  categories: typeof faqCategories;
  searchTerm: string;
  expandedFaq: number | null;
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  onToggleFaq: (index: number) => void;
};

export function FaqSection({
  faqList,
  categories,
  searchTerm,
  expandedFaq,
  selectedCategory,
  onCategoryChange,
  onToggleFaq,
}: Props): React.JSX.Element {
  const filteredFaqs = faqList.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="bg-fixly-card py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-fixly-text-light">Find quick answers to common questions</p>
        </div>

        {/* FAQ Categories */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-fixly-accent text-white'
                  : 'bg-fixly-bg text-fixly-text-muted hover:bg-fixly-accent/10'
              }`}
            >
              <category.icon className="mr-2 h-4 w-4" />
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="overflow-hidden rounded-lg border border-fixly-border bg-fixly-bg"
            >
              <button
                onClick={() => onToggleFaq(index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-fixly-card/50"
              >
                <span className="pr-4 font-semibold text-fixly-text">{faq.question}</span>
                {expandedFaq === index ? (
                  <ChevronUp className="h-5 w-5 flex-shrink-0 text-fixly-accent" />
                ) : (
                  <ChevronDown className="h-5 w-5 flex-shrink-0 text-fixly-text-muted" />
                )}
              </button>

              {expandedFaq === index && (
                <div className="px-6 pb-4">
                  <p className="leading-relaxed text-fixly-text-light">{faq.answer}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
              <Search className="h-8 w-8 text-fixly-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fixly-text">No results found</h3>
            <p className="text-fixly-text-light">
              Try adjusting your search terms or browse a different category
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
