'use client';

import { motion } from 'framer-motion';

import type { stats } from '@/app/about/about.data';

type Props = {
  statList: typeof stats;
};

export function ImpactSection({ statList }: Props): React.JSX.Element {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">Our Impact</h2>
          <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
            Numbers that tell the story of our growing community.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {statList.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="mb-2 text-3xl font-bold text-fixly-accent md:text-4xl">
                {stat.value}
              </div>
              <div className="font-medium text-fixly-text-muted">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
