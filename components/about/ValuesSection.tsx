'use client';

import { motion } from 'framer-motion';

import type { values } from '@/app/about/about.data';

type Props = {
  valueList: typeof values;
};

export function ValuesSection({ valueList }: Props): React.JSX.Element {
  return (
    <section className="bg-fixly-card px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">Our Values</h2>
          <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
            The principles that guide everything we do at Fixly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {valueList.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl p-6 text-center transition-colors duration-200 hover:bg-fixly-bg"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
                <value.icon className="h-8 w-8 text-fixly-accent" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-fixly-text">{value.title}</h3>
              <p className="text-fixly-text-light">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
