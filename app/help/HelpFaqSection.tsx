'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import type { FaqCategory } from './help.types';

type HelpFaqSectionProps = {
  faqs: FaqCategory[];
  expandedFAQs: Set<string>;
  onToggle: (id: string) => void;
};

export default function HelpFaqSection({ faqs, expandedFAQs, onToggle }: HelpFaqSectionProps) {
  return (
    <div className="mb-8">
      <h2 className="mb-6 text-2xl font-bold text-fixly-text">Frequently Asked Questions</h2>

      {faqs.map((faqCategory, categoryIndex) => (
        <div key={faqCategory.id} className="mb-8">
          <h3 className="mb-4 text-xl font-semibold text-fixly-text">{faqCategory.title}</h3>
          <div className="space-y-2">
            {faqCategory.questions.map((faq, index) => {
              const faqId = `${faqCategory.id}-${index}`;
              const isExpanded = expandedFAQs.has(faqId);

              return (
                <motion.div
                  key={faqId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: (categoryIndex * faqCategory.questions.length + index) * 0.05,
                  }}
                  className="rounded-lg border border-fixly-border bg-fixly-card"
                >
                  <button
                    onClick={() => onToggle(faqId)}
                    className="hover:bg-fixly-bg-light flex w-full items-center justify-between px-6 py-4 text-left transition-colors"
                  >
                    <span className="font-medium text-fixly-text">{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-fixly-text-light transition-transform${isExpanded ? ' rotate-180 transform' : ''}`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-4">
                      <p className="text-fixly-text dark:text-fixly-text">{faq.a}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
