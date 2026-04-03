'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { FAQS, FIXER_PLANS, HIRER_FEATURES } from './pricing.data';
import PricingFAQ from './PricingFAQ';
import PricingFixerPlans from './PricingFixerPlans';
import PricingHirerSection from './PricingHirerSection';

export default function PricingPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const selectedRole = searchParams?.get('role') === 'hirer' ? 'hirer' : 'fixer';

  return (
    <div className="min-h-screen bg-fixly-bg">
      <header className="border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Pricing</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <CreditCard className="mx-auto mb-6 h-16 w-16 text-fixly-accent" />
          <h1 className="mb-4 text-4xl font-bold text-fixly-text">Simple, Transparent Pricing</h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-fixly-text-light">
            Choose the plan that works best for you. No hidden fees, no surprises. Start free and
            upgrade when you&apos;re ready for more opportunities.
          </p>
        </motion.div>

        <div className="mb-12 flex justify-center">
          <div className="flex rounded-lg bg-fixly-card p-1">
            <Link
              href="/pricing?role=fixer"
              className={`rounded-md px-6 py-2 font-medium transition-colors ${
                selectedRole === 'fixer'
                  ? 'bg-fixly-accent text-fixly-text'
                  : 'text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              For Fixers
            </Link>
            <Link
              href="/pricing?role=hirer"
              className={`rounded-md px-6 py-2 font-medium transition-colors ${
                selectedRole === 'hirer'
                  ? 'bg-fixly-accent text-fixly-text'
                  : 'text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              For Hirers
            </Link>
          </div>
        </div>

        {selectedRole === 'fixer' ? (
          <PricingFixerPlans plans={FIXER_PLANS} />
        ) : (
          <PricingHirerSection features={HIRER_FEATURES} />
        )}

        <PricingFAQ faqs={FAQS} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-16 text-center"
        >
          <h2 className="mb-4 text-2xl font-bold text-fixly-text">Ready to Get Started?</h2>
          <p className="mb-6 text-fixly-text-light">
            Join thousands of satisfied users on Fixly today
          </p>
          <div className="flex flex-col justify-center gap-4 md:flex-row">
            <Link href="/auth/signup?role=hirer" className="btn-primary">
              Start Hiring (Free)
            </Link>
            <Link href="/auth/signup?role=fixer" className="btn-secondary">
              Become a Fixer
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-6 left-6">
        <Link
          href="/"
          className="hover-lift rounded-full border border-fixly-border bg-fixly-card p-3 shadow-fixly transition-all duration-200 hover:bg-fixly-card/80"
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </Link>
      </div>
    </div>
  );
}
