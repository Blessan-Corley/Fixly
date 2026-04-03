'use client';

import { motion } from 'framer-motion';

import type { safetyTips } from '@/app/safety/safety.data';

type Props = {
  tips: typeof safetyTips;
};

export function SafetyTipsSection({ tips }: Props): React.JSX.Element {
  return (
    <section className="bg-fixly-card py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">Safety Tips</h2>
          <p className="text-xl text-fixly-text-light">
            Best practices to ensure a safe and successful service experience
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {tips.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl bg-fixly-bg p-6"
            >
              <div className="mb-6 flex items-center">
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-fixly-accent/10">
                  <section.icon className="h-5 w-5 text-fixly-accent" />
                </div>
                <h3 className="text-lg font-semibold text-fixly-text">{section.title}</h3>
              </div>

              <ul className="space-y-3">
                {section.tips.map((tip, tipIndex) => (
                  <li key={tipIndex} className="flex items-start">
                    <div className="mr-3 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fixly-accent" />
                    <span className="text-sm text-fixly-text-muted">{tip}</span>
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
