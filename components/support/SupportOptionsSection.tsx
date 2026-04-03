'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

import type { supportOptions } from '@/app/support/support.data';

type Props = {
  options: typeof supportOptions;
};

export function SupportOptionsSection({ options }: Props): React.JSX.Element {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">Get Support</h2>
          <p className="text-xl text-fixly-text-light">
            Choose the best way to reach our support team
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {options.map((option, index) => (
            <motion.div
              key={option.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="hover-lift rounded-xl bg-fixly-card p-8 text-center transition-all duration-300 hover:shadow-fixly-lg"
            >
              <div
                className={`${option.color} mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full`}
              >
                <option.icon className="h-8 w-8 text-white" />
              </div>

              <h3 className="mb-2 text-xl font-semibold text-fixly-text">{option.title}</h3>

              <p className="mb-4 text-fixly-text-light">{option.description}</p>

              <div className="mb-6 flex items-center justify-center text-sm text-fixly-text-muted">
                <Clock className="mr-2 h-4 w-4" />
                {option.availability}
              </div>

              {option.phone !== undefined && (
                <div className="mb-4 font-semibold text-fixly-accent">{option.phone}</div>
              )}

              {option.email !== undefined && (
                <div className="mb-4 font-semibold text-fixly-accent">{option.email}</div>
              )}

              <button className="btn-primary w-full">{option.action}</button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
