'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

import type { insuranceInfo } from '@/app/safety/safety.data';

type Props = {
  info: typeof insuranceInfo;
};

export function InsuranceSection({ info }: Props): React.JSX.Element {
  return (
    <section className="bg-fixly-card py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
            <Shield className="h-8 w-8 text-fixly-accent" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">{info.title}</h2>
          <p className="text-xl text-fixly-text-light">{info.description}</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {info.coverage.map((coverage, index) => (
            <motion.div
              key={coverage.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl bg-fixly-bg p-6 text-center"
            >
              <h3 className="mb-2 text-lg font-semibold text-fixly-text">{coverage.type}</h3>
              <p className="mb-4 text-sm text-fixly-text-light">{coverage.description}</p>
              <div className="rounded-lg bg-fixly-accent/10 p-3">
                <span className="font-semibold text-fixly-accent">{coverage.amount}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
