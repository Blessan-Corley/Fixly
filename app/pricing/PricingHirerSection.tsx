'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import type { HirerFeature } from './pricing.data';

type PricingHirerSectionProps = {
  features: HirerFeature[];
};

export default function PricingHirerSection({
  features,
}: PricingHirerSectionProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mb-16 max-w-4xl"
    >
      <div className="card mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold text-fixly-text">Free for All Hirers</h2>
        <p className="mb-6 text-xl text-fixly-text-light">
          Post unlimited jobs and connect with verified professionals at no cost
        </p>
        <div className="mb-4 text-6xl font-bold text-fixly-accent">Rs0</div>
        <p className="text-fixly-text-muted">Always free, no hidden charges</p>
        <Link href="/auth/signup?role=hirer" className="btn-primary mt-6 px-8 py-3">
          Start Hiring Today
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start rounded-xl p-6 transition-colors hover:bg-fixly-card"
          >
            <feature.icon className="mr-4 mt-1 h-8 w-8 text-fixly-accent" />
            <div>
              <h3 className="mb-2 text-lg font-semibold text-fixly-text">{feature.title}</h3>
              <p className="text-fixly-text-light">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
