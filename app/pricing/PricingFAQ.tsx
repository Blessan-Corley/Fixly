'use client';

import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

import type { FaqItem } from './pricing.data';

type PricingFAQProps = {
  faqs: FaqItem[];
};

export default function PricingFAQ({ faqs }: PricingFAQProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mx-auto max-w-4xl"
    >
      <h2 className="mb-12 text-center text-3xl font-bold text-fixly-text">
        Frequently Asked Questions
      </h2>
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-start">
              <HelpCircle className="mr-4 mt-1 h-6 w-6 flex-shrink-0 text-fixly-accent" />
              <div>
                <h3 className="mb-2 text-lg font-semibold text-fixly-text">{faq.question}</h3>
                <p className="text-fixly-text-light">{faq.answer}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
