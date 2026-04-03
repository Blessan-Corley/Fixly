'use client';

import { motion } from 'framer-motion';

export default function HowItWorksHero(): React.JSX.Element {
  return (
    <section className="px-4 pb-12 pt-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-4xl font-bold text-fixly-text md:text-5xl"
        >
          How Fixly
          <span className="block text-fixly-accent">Works</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 text-xl text-fixly-text-light"
        >
          Simple, secure, and reliable way to connect customers with service professionals
        </motion.p>
      </div>
    </section>
  );
}
