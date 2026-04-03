'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

import type { FaqItem, SupportCategory } from './contact.data';

type ContactSupportPanelProps = {
  supportCategories: SupportCategory[];
  faqItems: FaqItem[];
};

export default function ContactSupportPanel({
  supportCategories,
  faqItems,
}: ContactSupportPanelProps): JSX.Element {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="card"
      >
        <h2 className="mb-6 text-2xl font-bold text-fixly-text">How Can We Help?</h2>
        <div className="space-y-4">
          {supportCategories.map((category, index) => (
            <div
              key={index}
              className="flex items-start rounded-lg p-4 transition-colors hover:bg-fixly-bg"
            >
              <category.icon className="mr-4 mt-1 h-6 w-6 text-fixly-accent" />
              <div>
                <h3 className="mb-1 font-semibold text-fixly-text">{category.title}</h3>
                <p className="text-sm text-fixly-text-muted">{category.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="card border-fixly-accent"
      >
        <div className="text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-fixly-accent" />
          <h3 className="mb-2 text-xl font-semibold text-fixly-text">Quick Response Guarantee</h3>
          <p className="text-fixly-text-light">
            We typically respond to all inquiries within 24 hours during business days. For urgent
            matters, please call us directly.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="mb-6 text-2xl font-bold text-fixly-text">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="border-b border-fixly-border pb-4 last:border-b-0">
              <h3 className="mb-2 font-semibold text-fixly-text">{item.question}</h3>
              <p className="text-sm text-fixly-text-light">{item.answer}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
