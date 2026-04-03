'use client';

import { motion } from 'framer-motion';

import { safetyFeatures } from './how-it-works.data';

export default function HowItWorksSafety(): React.JSX.Element {
  const features = safetyFeatures;
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Safety &amp; Security
          </h2>
          <p className="text-xl text-fixly-text-light">
            Your safety and security are our top priorities
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
                <feature.icon className="h-8 w-8 text-fixly-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-fixly-text">{feature.title}</h3>
              <p className="text-fixly-text-light">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
