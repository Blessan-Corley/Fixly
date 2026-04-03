'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HowItWorksCta(): React.JSX.Element {
  return (
    <section className="bg-fixly-card py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-fixly-bg p-12 shadow-fixly-lg"
        >
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Ready to Experience Fixly?
          </h2>
          <p className="mb-8 text-xl text-fixly-text-light">
            Join thousands of satisfied customers and service providers
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup?role=hirer" className="btn-primary hover-lift px-8 py-4 text-lg">
              I Need a Service
            </Link>
            <Link href="/auth/signup?role=fixer" className="btn-secondary hover-lift px-8 py-4 text-lg">
              I&apos;m a Service Provider
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
