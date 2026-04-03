'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

import type { safetyFeatures } from '@/app/safety/safety.data';

type Props = {
  features: typeof safetyFeatures;
};

export function SafetyFeaturesSection({ features }: Props): React.JSX.Element {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Our Safety Features
          </h2>
          <p className="text-xl text-fixly-text-light">
            Multiple layers of protection to ensure your safety and security
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl bg-fixly-card p-8"
            >
              <div className="mb-6 flex items-center">
                <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fixly-accent/10">
                  <feature.icon className="h-6 w-6 text-fixly-accent" />
                </div>
                <h3 className="text-xl font-semibold text-fixly-text">{feature.title}</h3>
              </div>

              <p className="mb-6 text-fixly-text-light">{feature.description}</p>

              <ul className="space-y-3">
                {feature.features.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <CheckCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-fixly-accent" />
                    <span className="text-fixly-text-muted">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
